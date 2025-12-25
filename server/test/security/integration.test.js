// server/test/security/integration.test.js

const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../app');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Production Security Integration Tests', () => {
  describe('Security Headers', () => {
    it('should include security headers in responses', (done) => {
      chai.request(app)
        .get('/healthz')
        .end((err, res) => {
          expect(res).to.have.header('X-Content-Type-Options', 'nosniff');
          expect(res).to.have.header('X-Frame-Options', 'DENY');
          expect(res).to.have.header('X-XSS-Protection', '1; mode=block');
          expect(res).to.have.header('X-Request-ID');
          done();
        });
    });
  });

  describe('CORS Configuration', () => {
    it('should reject requests from unauthorized origins', (done) => {
      chai.request(app)
        .get('/api')
        .set('Origin', 'https://evil-site.com')
        .end((err, res) => {
          // CORS error should be handled appropriately
          expect(res.status).to.be.oneOf([403, 500]);
          done();
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit requests to auth endpoints', function(done) {
      this.timeout(10000);
      
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          chai.request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'invalid' })
        );
      }

      Promise.allSettled(promises).then(results => {
        const lastResult = results[results.length - 1];
        expect(lastResult.value.status).to.equal(429);
        done();
      });
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for protected endpoints', (done) => {
      chai.request(app)
        .get('/api/transactions')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('code', 'TOKEN_MISSING');
          done();
        });
    });

    it('should reject invalid tokens', (done) => {
      chai.request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid.token.here')
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body).to.have.property('code', 'TOKEN_INVALID');
          done();
        });
    });
  });

  describe('Health Check', () => {
    it('should provide health status without authentication', (done) => {
      chai.request(app)
        .get('/healthz')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('status', 'healthy');
          expect(res.body).to.have.property('timestamp');
          expect(res.body).to.have.property('uptime');
          done();
        });
    });
  });

  describe('Error Handling', () => {
    it('should return consistent error format', (done) => {
      chai.request(app)
        .get('/api/nonexistent-endpoint')
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          expect(res.body).to.have.property('correlationId');
          done();
        });
    });

    it('should not expose stack traces in production mode', (done) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      chai.request(app)
        .get('/api/nonexistent-endpoint')
        .end((err, res) => {
          expect(res.body).to.not.have.property('stack');
          expect(res.body.details).to.be.undefined;
          
          process.env.NODE_ENV = originalEnv;
          done();
        });
    });
  });

  describe('Request Logging', () => {
    it('should include request ID in response headers', (done) => {
      chai.request(app)
        .get('/healthz')
        .end((err, res) => {
          expect(res).to.have.header('X-Request-ID');
          const requestId = res.get('X-Request-ID');
          expect(requestId).to.be.a('string');
          expect(requestId).to.have.length.greaterThan(0);
          done();
        });
    });
  });

  describe('Cross-User Access Prevention', () => {
    let user1Token, user2Token;
    const user1Id = 'test-user-cross-1-' + Date.now();
    const user2Id = 'test-user-cross-2-' + Date.now();

    before(async () => {
      const userDAO = require('../../models/user_dao');
      
      // Create test users
      await new Promise((resolve, reject) => {
        userDAO.createUser({
          user_id: user1Id,
          username: 'crosstest1',
          email: 'cross1@example.com',
          password: 'password123'
        }, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        userDAO.createUser({
          user_id: user2Id,
          username: 'crosstest2',
          email: 'cross2@example.com',
          password: 'password123'
        }, (err) => err ? reject(err) : resolve());
      });

      // Get tokens
      const login1 = await chai.request(app)
        .post('/api/auth/login')
        .send({ email: 'cross1@example.com', password: 'password123' });
      
      const login2 = await chai.request(app)
        .post('/api/auth/login')
        .send({ email: 'cross2@example.com', password: 'password123' });

      user1Token = login1.body.accessToken;
      user2Token = login2.body.accessToken;
    });

    after(async () => {
      // Cleanup
      const userDAO = require('../../models/user_dao');
      await new Promise(resolve => {
        userDAO.deleteUser(user1Id, () => resolve());
      });
      await new Promise(resolve => {
        userDAO.deleteUser(user2Id, () => resolve());
      });
    });

    it('should prevent access to other user resources via URL params', (done) => {
      chai.request(app)
        .get(`/api/users/${user2Id}`) // User1 trying to access User2's data
        .set('Authorization', `Bearer ${user1Token}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body).to.have.property('code', 'CROSS_USER_ACCESS_DENIED');
          done();
        });
    });

    it('should allow access to own resources', (done) => {
      chai.request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.user).to.have.property('user_id', user1Id);
          done();
        });
    });
  });
});

describe('Database Performance Tests', () => {
  describe('Query Performance', () => {
    it('should demonstrate indexed query performance', (done) => {
      // This is a simple test to show query execution
      // In a real scenario, you'd use EXPLAIN QUERY PLAN
      const { getConnection } = require('../../db/index');
      const db = getConnection();
      
      const startTime = Date.now();
      db.get(
        'SELECT COUNT(*) as count FROM Transactions WHERE user_id = ?',
        ['test-user-id'],
        (err, row) => {
          const duration = Date.now() - startTime;
          
          // Query should be fast (under 100ms for indexed queries)
          expect(duration).to.be.lessThan(100);
          expect(row).to.have.property('count');
          done();
        }
      );
    });
  });
});
