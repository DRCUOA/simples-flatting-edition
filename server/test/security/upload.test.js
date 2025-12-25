// server/test/security/upload.test.js

const chai = require('chai');
const chaiHttp = require('chai-http');
const fs = require('fs');
const path = require('path');
const app = require('../../app');

chai.use(chaiHttp);
const expect = chai.expect;

describe('File Upload Security Tests', () => {
  let accessToken;
  const testUserId = 'test-upload-user-' + Date.now();

  before(async () => {
    // Create test user and get access token
    const userDAO = require('../../models/user_dao');
    
    await new Promise((resolve, reject) => {
      userDAO.createUser({
        user_id: testUserId,
        username: 'uploadtestuser',
        email: 'uploadtest@example.com',
        password: 'testPassword123!'
      }, (err) => err ? reject(err) : resolve());
    });

    // Login to get access token
    const loginResponse = await chai.request(app)
      .post('/api/auth/login')
      .send({
        email: 'uploadtest@example.com',
        password: 'testPassword123!'
      });

    accessToken = loginResponse.body.accessToken;
  });

  after(async () => {
    // Cleanup test user
    const userDAO = require('../../models/user_dao');
    await new Promise(resolve => {
      userDAO.deleteUser(testUserId, () => resolve());
    });
  });

  describe('CSV Upload Security', () => {
    const createTestFile = (filename, content) => {
      const testFilePath = path.join(__dirname, filename);
      fs.writeFileSync(testFilePath, content);
      return testFilePath;
    };

    const cleanupTestFile = (filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    };

    it('should accept valid CSV file', function(done) {
      this.timeout(5000);
      
      const csvContent = 'date,description,amount\n2024-01-01,Test Transaction,100.00\n';
      const testFile = createTestFile('test-valid.csv', csvContent);

      chai.request(app)
        .post('/api/transactions/import') // Assuming this endpoint uses upload middleware
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('csvFile', testFile)
        .end((err, res) => {
          cleanupTestFile(testFile);
          
          // Response might vary based on implementation
          // Main goal is to ensure file is accepted and processed
          expect(res.status).to.be.oneOf([200, 202, 400]); // 400 might be validation error, not security
          if (res.status === 400) {
            // If it's a validation error, it should not be a security error
            expect(res.body.code).to.not.equal('INVALID_FILE_TYPE');
            expect(res.body.code).to.not.equal('BINARY_CONTENT_DETECTED');
          }
          done();
        });
    });

    it('should reject non-CSV file types', function(done) {
      this.timeout(5000);
      
      const txtContent = 'This is a text file, not CSV';
      const testFile = createTestFile('test-invalid.txt', txtContent);

      chai.request(app)
        .post('/api/transactions/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('csvFile', testFile)
        .end((err, res) => {
          cleanupTestFile(testFile);
          
          expect(res).to.have.status(415);
          expect(res.body).to.have.property('code', 'INVALID_FILE_EXTENSION');
          done();
        });
    });

    it('should reject files that are too large', function(done) {
      this.timeout(10000);
      
      // Create a file larger than 5MB
      const largeContent = 'a'.repeat(6 * 1024 * 1024); // 6MB
      const testFile = createTestFile('test-large.csv', largeContent);

      chai.request(app)
        .post('/api/transactions/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('csvFile', testFile)
        .end((err, res) => {
          cleanupTestFile(testFile);
          
          expect(res).to.have.status(413);
          expect(res.body).to.have.property('code', 'FILE_TOO_LARGE');
          done();
        });
    });

    it('should reject binary files', function(done) {
      this.timeout(5000);
      
      // Create a binary file with null bytes
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
      const testFile = path.join(__dirname, 'test-binary.csv');
      fs.writeFileSync(testFile, binaryContent);

      chai.request(app)
        .post('/api/transactions/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('csvFile', testFile)
        .end((err, res) => {
          cleanupTestFile(testFile);
          
          expect(res).to.have.status(415);
          expect(res.body).to.have.property('code', 'BINARY_CONTENT_DETECTED');
          done();
        });
    });

    it('should reject files with suspicious names', function(done) {
      this.timeout(5000);
      
      const csvContent = 'date,description,amount\n2024-01-01,Test,100\n';
      const testFile = createTestFile('../../../etc/passwd.csv', csvContent);

      chai.request(app)
        .post('/api/transactions/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('csvFile', testFile)
        .end((err, res) => {
          cleanupTestFile(testFile);
          
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('code', 'SUSPICIOUS_FILENAME');
          done();
        });
    });

    it('should reject empty files', function(done) {
      this.timeout(5000);
      
      const testFile = createTestFile('test-empty.csv', '');

      chai.request(app)
        .post('/api/transactions/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('csvFile', testFile)
        .end((err, res) => {
          cleanupTestFile(testFile);
          
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('code', 'EMPTY_FILE');
          done();
        });
    });

    it('should rate limit file uploads', function(done) {
      this.timeout(15000);
      
      const csvContent = 'date,description,amount\n2024-01-01,Test,100\n';
      
      // Try to upload more than the rate limit allows
      const promises = [];
      for (let i = 0; i < 6; i++) {
        const testFile = createTestFile(`test-rate-limit-${i}.csv`, csvContent);
        
        const promise = chai.request(app)
          .post('/api/transactions/import')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('csvFile', testFile)
          .then(res => {
            cleanupTestFile(testFile);
            return res;
          })
          .catch(err => {
            cleanupTestFile(testFile);
            return err.response;
          });
        
        promises.push(promise);
      }

      Promise.allSettled(promises).then(results => {
        // Check if at least one request was rate limited
        const rateLimited = results.some(result => 
          result.value && result.value.status === 429
        );
        
        expect(rateLimited).to.be.true;
        done();
      });
    });

    it('should require authentication for uploads', function(done) {
      this.timeout(5000);
      
      const csvContent = 'date,description,amount\n2024-01-01,Test,100\n';
      const testFile = createTestFile('test-no-auth.csv', csvContent);

      chai.request(app)
        .post('/api/transactions/import')
        .attach('csvFile', testFile)
        .end((err, res) => {
          cleanupTestFile(testFile);
          
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('code', 'TOKEN_MISSING');
          done();
        });
    });
  });

  describe('File Cleanup', () => {
    it('should cleanup uploaded files after processing', function(done) {
      this.timeout(5000);
      
      const csvContent = 'date,description,amount\n2024-01-01,Test,100\n';
      const testFile = createTestFile('test-cleanup.csv', csvContent);

      chai.request(app)
        .post('/api/transactions/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('csvFile', testFile)
        .end((err, res) => {
          cleanupTestFile(testFile);
          
          // Check that no temporary files are left in the uploads directory
          const uploadsDir = path.join(__dirname, '../../uploads');
          if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            const tempFiles = files.filter(file => 
              file.includes('test-cleanup') || file.startsWith(Date.now().toString())
            );
            expect(tempFiles).to.have.length(0);
          }
          
          done();
        });
    });
  });
});
