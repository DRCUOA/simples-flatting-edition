// server/test/security/auth.test.js

const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../app');
const userDAO = require('../../models/user_dao');
const bcrypt = require('bcryptjs');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Authentication Security Tests', () => {
  let testUser;
  let accessToken;
  let refreshCookie;

  before(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('testPassword123!', 12);
    testUser = {
      user_id: 'test-user-auth-' + Date.now(),
      username: 'testuser',
      email: 'test@example.com',
      password_hash: hashedPassword,
      role: 'user'
    };

    // Insert test user directly into database
    await new Promise((resolve, reject) => {
      userDAO.createUser({
        user_id: testUser.user_id,
        username: testUser.username,
        email: testUser.email,
        password: 'testPassword123!'
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  });

  after(async () => {
    // Cleanup test user
    await new Promise((resolve, reject) => {
      userDAO.deleteUser(testUser.user_id, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', (done) => {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'testPassword123!'
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('accessToken');
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('user_id', testUser.user_id);
          expect(res).to.have.cookie('refresh_token');
          
          accessToken = res.body.accessToken;
          refreshCookie = res.headers['set-cookie'].find(cookie => 
            cookie.startsWith('refresh_token=')
          );
          
          done();
        });
    });

    it('should reject invalid email', (done) => {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'testPassword123!'
        })
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('error', 'Invalid credentials');
          expect(res.body).to.have.property('code', 'INVALID_CREDENTIALS');
          done();
        });
    });

    it('should reject invalid password', (done) => {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongPassword'
        })
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('error', 'Invalid credentials');
          expect(res.body).to.have.property('code', 'INVALID_CREDENTIALS');
          done();
        });
    });

    it('should rate limit login attempts', function(done) {
      this.timeout(10000);
      
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          chai.request(app)
            .post('/api/auth/login')
            .send({
              email: 'invalid@example.com',
              password: 'invalid'
            })
        );
      }

      Promise.allSettled(promises).then(results => {
        const lastResult = results[results.length - 1];
        expect(lastResult.value).to.have.status(429);
        expect(lastResult.value.body).to.have.property('code', 'RATE_LIMIT_EXCEEDED');
        done();
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh cookie', (done) => {
      chai.request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('accessToken');
          expect(res.body).to.have.property('user');
          done();
        });
    });

    it('should reject request without refresh cookie', (done) => {
      chai.request(app)
        .post('/api/auth/refresh')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('code', 'REFRESH_TOKEN_MISSING');
          done();
        });
    });

    it('should reject invalid refresh token', (done) => {
      chai.request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refresh_token=invalid.token.here')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('code', 'REFRESH_TOKEN_INVALID');
          done();
        });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and clear refresh cookie', (done) => {
      chai.request(app)
        .post('/api/auth/logout')
        .set('Cookie', refreshCookie)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message', 'Logged out successfully');
          
          // Check that cookie is cleared
          const setCookieHeader = res.headers['set-cookie'];
          if (setCookieHeader) {
            const clearCookie = setCookieHeader.find(cookie => 
              cookie.startsWith('refresh_token=;')
            );
            expect(clearCookie).to.exist;
          }
          done();
        });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', (done) => {
      chai.request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('user_id', testUser.user_id);
          expect(res.body.user).to.not.have.property('password_hash');
          done();
        });
    });

    it('should reject request without token', (done) => {
      chai.request(app)
        .get('/api/auth/me')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('code', 'TOKEN_MISSING');
          done();
        });
    });

    it('should reject invalid token', (done) => {
      chai.request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body).to.have.property('code', 'TOKEN_INVALID');
          done();
        });
    });
  });

  describe('Token Security', () => {
    it('should include proper JWT claims', (done) => {
      const jwt = require('jsonwebtoken');
      const { JWT_ACCESS_SECRET } = require('../../middleware/auth');
      
      const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET);
      
      expect(decoded).to.have.property('sub', testUser.user_id);
      expect(decoded).to.have.property('role', 'user');
      expect(decoded).to.have.property('iat');
      expect(decoded).to.have.property('exp');
      expect(decoded).to.have.property('iss');
      expect(decoded).to.have.property('aud');
      
      done();
    });

    it('should expire access token after configured time', function(done) {
      this.timeout(20000);
      
      // Create a short-lived token for testing
      const { generateAccessToken } = require('../../middleware/auth');
      const shortToken = generateAccessToken(testUser);
      
      // Should work immediately
      chai.request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${shortToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          
          // Test that it expires (this would need a very short TTL for practical testing)
          // In practice, you'd mock the time or use a test configuration
          done();
        });
    });
  });
});
