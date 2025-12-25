// server/utils/ofxParser.js

const fs = require('fs');
const { parseString } = require('xml2js');

/**
 * Parse OFX file and extract all available fields
 * Handles both OFX 1.x (SGML) and 2.x (XML) formats
 * @param {string} filePath - Path to the OFX file
 * @returns {Promise<Object>} - Parsed OFX data with account info, balances, and transactions
 */
async function parseOFX(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Check if it's SGML format (OFX 1.x) - has OFXHEADER
    const isSGML = fileContent.includes('OFXHEADER') || !fileContent.trim().startsWith('<');
    
    if (isSGML) {
      return parseSGMLOFX(fileContent);
    } else {
      return parseXMLOFX(fileContent);
    }
  } catch (error) {
    throw new Error(`Failed to parse OFX file: ${error.message}`);
  }
}

/**
 * Parse SGML format OFX (1.x)
 * @param {string} content - File content
 * @returns {Object} - Parsed data
 */
function parseSGMLOFX(content) {
  const result = {
    account: {},
    statement: {},
    balances: {},
    transactions: []
  };
  
  // Extract account information
  const bankIdMatch = content.match(/<BANKID>([^<]+)/i);
  const acctIdMatch = content.match(/<ACCTID>([^<]+)/i);
  const acctTypeMatch = content.match(/<ACCTTYPE>([^<]+)/i);
  const branchIdMatch = content.match(/<BRANCHID>([^<]+)/i);
  
  result.account.bankId = bankIdMatch ? bankIdMatch[1].trim() : null;
  result.account.accountId = acctIdMatch ? acctIdMatch[1].trim() : null;
  result.account.accountType = acctTypeMatch ? acctTypeMatch[1].trim() : null;
  result.account.branchId = branchIdMatch ? branchIdMatch[1].trim() : null;
  
  // Extract statement period
  const dtStartMatch = content.match(/<DTSTART>([^<]+)/i);
  const dtEndMatch = content.match(/<DTEND>([^<]+)/i);
  
  result.statement.startDate = dtStartMatch ? parseOFXDate(dtStartMatch[1].trim()) : null;
  result.statement.endDate = dtEndMatch ? parseOFXDate(dtEndMatch[1].trim()) : null;
  
  // Extract balances
  const ledgerBalMatch = content.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<]+)/i);
  const ledgerBalDateMatch = content.match(/<LEDGERBAL>[\s\S]*?<DTASOF>([^<]+)/i);
  const availBalMatch = content.match(/<AVAILBAL>[\s\S]*?<BALAMT>([^<]+)/i);
  const availBalDateMatch = content.match(/<AVAILBAL>[\s\S]*?<DTASOF>([^<]+)/i);
  
  result.balances.ledgerBalance = ledgerBalMatch ? parseFloat(ledgerBalMatch[1].trim()) : null;
  result.balances.ledgerBalanceDate = ledgerBalDateMatch ? parseOFXDate(ledgerBalDateMatch[1].trim()) : null;
  result.balances.availableBalance = availBalMatch ? parseFloat(availBalMatch[1].trim()) : null;
  result.balances.availableBalanceDate = availBalDateMatch ? parseOFXDate(availBalDateMatch[1].trim()) : null;
  
  // Extract transactions
  const transactionMatches = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi);
  if (transactionMatches) {
    result.transactions = transactionMatches.map(match => {
      const txn = {};
      
      const dtPostedMatch = match.match(/<DTPOSTED>([^<]+)/i);
      const dtAvailMatch = match.match(/<DTAVAIL>([^<]+)/i);
      const trnAmtMatch = match.match(/<TRNAMT>([^<]+)/i);
      const fitIdMatch = match.match(/<FITID>([^<]+)/i);
      const nameMatch = match.match(/<NAME>([^<]+)/i);
      const memoMatch = match.match(/<MEMO>([^<]+)/i);
      const trnTypeMatch = match.match(/<TRNTYPE>([^<]+)/i);
      const checkNumMatch = match.match(/<CHECKNUM>([^<]+)/i);
      const refNumMatch = match.match(/<REFNUM>([^<]+)/i);
      const sicMatch = match.match(/<SIC>([^<]+)/i);
      
      txn.dtPosted = dtPostedMatch ? parseOFXDate(dtPostedMatch[1].trim()) : null;
      txn.dtAvail = dtAvailMatch ? parseOFXDate(dtAvailMatch[1].trim()) : null;
      txn.trnAmt = trnAmtMatch ? parseFloat(trnAmtMatch[1].trim()) : null;
      txn.fitId = fitIdMatch ? fitIdMatch[1].trim() : null;
      txn.name = nameMatch ? nameMatch[1].trim() : null;
      txn.memo = memoMatch ? memoMatch[1].trim() : null;
      txn.trnType = trnTypeMatch ? trnTypeMatch[1].trim() : null;
      txn.checkNum = checkNumMatch ? checkNumMatch[1].trim() : null;
      txn.refNum = refNumMatch ? refNumMatch[1].trim() : null;
      txn.sic = sicMatch ? sicMatch[1].trim() : null;
      
      return txn;
    });
  }
  
  return result;
}

/**
 * Parse XML format OFX (2.x)
 * @param {string} content - File content
 * @returns {Promise<Object>} - Parsed data
 */
async function parseXMLOFX(content) {
  return new Promise((resolve, reject) => {
    parseString(content, { explicitArray: false, mergeAttrs: true }, (err, result) => {
      if (err) {
        reject(new Error(`Failed to parse XML OFX: ${err.message}`));
        return;
      }
      
      const parsed = {
        account: {},
        statement: {},
        balances: {},
        transactions: []
      };
      
      try {
        // Navigate through OFX structure
        const ofx = result.OFX || result.ofx;
        if (!ofx) {
          reject(new Error('Invalid OFX structure'));
          return;
        }
        
        // Extract account information
        const bankAcctFromReq = ofx.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKACCTFROM;
        const ccAcctFromReq = ofx.CCSTMTTRNRS?.CCSTMTRS?.CCACCTFROM;
        const acctFrom = bankAcctFromReq || ccAcctFromReq;
        
        if (acctFrom) {
          parsed.account.bankId = acctFrom.BANKID || null;
          parsed.account.accountId = acctFrom.ACCTID || null;
          parsed.account.accountType = acctFrom.ACCTTYPE || null;
          parsed.account.branchId = acctFrom.BRANCHID || null;
        }
        
        // Extract statement period
        const stmtTrnRs = ofx.BANKMSGSRSV1?.STMTTRNRS?.STMTRS || ofx.CCSTMTTRNRS?.CCSTMTRS;
        if (stmtTrnRs) {
          const bankTranList = stmtTrnRs.BANKTRANLIST;
          if (bankTranList) {
            parsed.statement.startDate = bankTranList.DTSTART ? parseOFXDate(bankTranList.DTSTART) : null;
            parsed.statement.endDate = bankTranList.DTEND ? parseOFXDate(bankTranList.DTEND) : null;
          }
          
          // Extract balances
          const ledgerBal = stmtTrnRs.LEDGERBAL;
          const availBal = stmtTrnRs.AVAILBAL;
          
          if (ledgerBal) {
            parsed.balances.ledgerBalance = parseFloat(ledgerBal.BALAMT || 0);
            parsed.balances.ledgerBalanceDate = ledgerBal.DTASOF ? parseOFXDate(ledgerBal.DTASOF) : null;
          }
          
          if (availBal) {
            parsed.balances.availableBalance = parseFloat(availBal.BALAMT || 0);
            parsed.balances.availableBalanceDate = availBal.DTASOF ? parseOFXDate(availBal.DTASOF) : null;
          }
          
          // Extract transactions
          const stmtTrn = bankTranList?.STMTTRN;
          if (stmtTrn) {
            const transactions = Array.isArray(stmtTrn) ? stmtTrn : [stmtTrn];
            parsed.transactions = transactions.map(txn => ({
              dtPosted: txn.DTPOSTED ? parseOFXDate(txn.DTPOSTED) : null,
              dtAvail: txn.DTAVAIL ? parseOFXDate(txn.DTAVAIL) : null,
              trnAmt: txn.TRNAMT ? parseFloat(txn.TRNAMT) : null,
              fitId: txn.FITID || null,
              name: txn.NAME || null,
              memo: txn.MEMO || null,
              trnType: txn.TRNTYPE || null,
              checkNum: txn.CHECKNUM || null,
              refNum: txn.REFNUM || null,
              sic: txn.SIC || null
            }));
          }
        }
        
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Error processing OFX data: ${error.message}`));
      }
    });
  });
}

/**
 * Parse OFX date format (YYYYMMDDHHMMSS or YYYYMMDD) to ISO format (YYYY-MM-DD)
 * @param {string} ofxDate - OFX date string
 * @returns {string|null} - ISO date string (YYYY-MM-DD) or null if invalid
 */
function parseOFXDate(ofxDate) {
  if (!ofxDate || typeof ofxDate !== 'string') {
    return null;
  }
  
  const trimmed = ofxDate.trim();
  
  // OFX dates are typically YYYYMMDDHHMMSS or YYYYMMDD
  if (trimmed.length >= 8) {
    const year = trimmed.substring(0, 4);
    const month = trimmed.substring(4, 6);
    const day = trimmed.substring(6, 8);
    
    // Validate
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    
    if (yearNum >= 1900 && yearNum <= 2100 &&
        monthNum >= 1 && monthNum <= 12 &&
        dayNum >= 1 && dayNum <= 31) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

module.exports = {
  parseOFX,
  parseOFXDate
};

