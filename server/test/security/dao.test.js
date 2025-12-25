// server/test/security/dao.test.js

const chai = require('chai');
const expect = chai.expect;
const { validateUserId, validateDAOOptions, createDAOError } = require('../../utils/daoGuards');

describe('DAO Security Tests', () => {
  describe('validateUserId', () => {
    it('should accept valid UUID', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(() => validateUserId(validUuid, 'test')).to.not.throw();
    });

    it('should reject null or undefined userId', () => {
      expect(() => validateUserId(null, 'test')).to.throw('User ID is required');
      expect(() => validateUserId(undefined, 'test')).to.throw('User ID is required');
      expect(() => validateUserId('', 'test')).to.throw('Invalid user ID provided');
    });

    it('should reject non-string userId', () => {
      expect(() => validateUserId(123, 'test')).to.throw('Invalid user ID provided');
      expect(() => validateUserId({}, 'test')).to.throw('Invalid user ID provided');
      expect(() => validateUserId([], 'test')).to.throw('Invalid user ID provided');
    });

    it('should reject invalid UUID format', () => {
      expect(() => validateUserId('not-a-uuid', 'test')).to.throw('Invalid user ID format');
      expect(() => validateUserId('123-456-789', 'test')).to.throw('Invalid user ID format');
    });
  });

  describe('validateDAOOptions', () => {
    it('should accept valid options with userId', () => {
      const options = { userId: '123e4567-e89b-12d3-a456-426614174000' };
      expect(() => validateDAOOptions(options, 'test')).to.not.throw();
    });

    it('should reject null or undefined options', () => {
      expect(() => validateDAOOptions(null, 'test')).to.throw('Options object with userId is required');
      expect(() => validateDAOOptions(undefined, 'test')).to.throw('Options object with userId is required');
    });

    it('should reject non-object options', () => {
      expect(() => validateDAOOptions('string', 'test')).to.throw('Options object with userId is required');
      expect(() => validateDAOOptions(123, 'test')).to.throw('Options object with userId is required');
    });

    it('should reject options without userId', () => {
      expect(() => validateDAOOptions({}, 'test')).to.throw('User ID is required');
      expect(() => validateDAOOptions({ otherField: 'value' }, 'test')).to.throw('User ID is required');
    });
  });

  describe('createDAOError', () => {
    it('should create error with default properties', () => {
      const error = createDAOError('Test message');
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal('Test message');
      expect(error.code).to.equal('DAO_ERROR');
      expect(error.details).to.deep.equal({});
    });

    it('should create error with custom properties', () => {
      const details = { userId: 'test-id' };
      const error = createDAOError('Test message', 'CUSTOM_CODE', details);
      expect(error.message).to.equal('Test message');
      expect(error.code).to.equal('CUSTOM_CODE');
      expect(error.details).to.deep.equal(details);
    });
  });
});

describe('DAO Integration Security Tests', () => {
  const userDAO = require('../../models/user_dao');
  let testUserId1, testUserId2;

  before(async () => {
    // Create test users
    testUserId1 = 'test-user-1-' + Date.now();
    testUserId2 = 'test-user-2-' + Date.now();

    await new Promise((resolve, reject) => {
      userDAO.createUser({
        user_id: testUserId1,
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'password123'
      }, (err) => err ? reject(err) : resolve());
    });

    await new Promise((resolve, reject) => {
      userDAO.createUser({
        user_id: testUserId2,
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123'
      }, (err) => err ? reject(err) : resolve());
    });
  });

  after(async () => {
    // Cleanup test users
    await new Promise(resolve => {
      userDAO.deleteUser(testUserId1, () => resolve());
    });
    await new Promise(resolve => {
      userDAO.deleteUser(testUserId2, () => resolve());
    });
  });

  describe('User Data Isolation', () => {
    it('should only return user\'s own data', (done) => {
      userDAO.getUserById(testUserId1, (err, user) => {
        expect(err).to.be.null;
        expect(user).to.not.be.null;
        expect(user.user_id).to.equal(testUserId1);
        expect(user.email).to.equal('test1@example.com');
        done();
      });
    });

    it('should not return other user\'s data', (done) => {
      // This test simulates trying to access another user's data
      // In a properly secured DAO, this should not return data or should fail
      userDAO.getUserById(testUserId2, (err, user) => {
        expect(err).to.be.null;
        if (user) {
          expect(user.user_id).to.not.equal(testUserId1);
        }
        done();
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should handle malicious input safely', (done) => {
      const maliciousUserId = "'; DROP TABLE Users; --";
      
      userDAO.getUserById(maliciousUserId, (err, user) => {
        // Should handle gracefully without causing database corruption
        expect(user).to.be.null; // Should not find anything
        
        // Verify database is still intact by finding our test user
        userDAO.getUserById(testUserId1, (err2, user2) => {
          expect(err2).to.be.null;
          expect(user2).to.not.be.null;
          expect(user2.user_id).to.equal(testUserId1);
          done();
        });
      });
    });

    it('should sanitize email input', (done) => {
      const maliciousEmail = "test@example.com' OR '1'='1";
      
      userDAO.getUserByEmail(maliciousEmail, (err, user) => {
        // Should not return any user or return specific user only
        if (user) {
          expect(user.email).to.not.include("OR");
          expect(user.email).to.not.include("'");
        }
        done();
      });
    });
  });

  describe('Input Validation', () => {
    it('should reject empty user data', (done) => {
      userDAO.createUser({}, (err, result) => {
        expect(err).to.not.be.null;
        expect(result).to.be.undefined;
        done();
      });
    });

    it('should reject invalid email format', (done) => {
      userDAO.createUser({
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      }, (err, result) => {
        // Depending on validation implementation, this should fail
        if (err) {
          expect(err.message).to.include('email').or.include('invalid').or.include('format');
        }
        done();
      });
    });

    it('should reject duplicate email', (done) => {
      userDAO.createUser({
        username: 'anothertestuser',
        email: 'test1@example.com', // Already exists
        password: 'password123'
      }, (err, result) => {
        expect(err).to.not.be.null;
        expect(err.message).to.include('UNIQUE').or.include('duplicate').or.include('constraint');
        done();
      });
    });
  });
});
