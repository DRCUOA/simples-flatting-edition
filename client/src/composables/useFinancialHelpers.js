import { ref, computed } from 'vue';

export function useFinancialHelpers() {
  // Loan Repayment Calculator
  const loanAmount = ref(0);
  const loanInterestRate = ref(0);
  const loanTermYears = ref(0);
  const loanResult = ref(null);

  const calculateLoan = () => {
    if (!loanAmount.value || !loanInterestRate.value || !loanTermYears.value) {
      return;
    }

    const principal = loanAmount.value;
    const annualRate = loanInterestRate.value / 100;
    const monthlyRate = annualRate / 12;
    const numberOfPayments = loanTermYears.value * 12;

    // Calculate monthly payment using amortization formula
    // M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    const totalAmount = monthlyPayment * numberOfPayments;
    const totalInterest = totalAmount - principal;

    loanResult.value = {
      monthlyPayment: monthlyPayment || 0,
      totalInterest: totalInterest || 0,
      totalAmount: totalAmount || 0
    };
  };

  // Savings Goal Calculator
  const savingsGoal = ref(0);
  const currentSavings = ref(0);
  const savingsMonths = ref(0);
  const savingsInterestRate = ref(0);
  const savingsResult = ref(null);

  const calculateSavings = () => {
    if (!savingsGoal.value || !savingsMonths.value) {
      return;
    }

    const target = savingsGoal.value;
    const current = currentSavings.value || 0;
    const months = savingsMonths.value;
    const annualRate = (savingsInterestRate.value || 0) / 100;
    const monthlyRate = annualRate / 12;
    const needed = target - current;

    if (needed <= 0) {
      savingsResult.value = {
        monthlySavings: 0,
        totalSaved: current,
        interestEarned: 0
      };
      return;
    }

    // Calculate monthly payment needed using future value of annuity formula
    // FV = PMT * [((1+r)^n - 1) / r]
    // Solving for PMT: PMT = FV * r / [((1+r)^n - 1)]
    let monthlySavings;
    if (monthlyRate === 0) {
      // Simple division if no interest
      monthlySavings = needed / months;
    } else {
      const futureValueFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
      monthlySavings = needed / futureValueFactor;
    }

    // Calculate total saved and interest
    const totalSaved = current + (monthlySavings * months);
    const interestEarned = target - totalSaved;

    savingsResult.value = {
      monthlySavings: monthlySavings || 0,
      totalSaved: totalSaved || 0,
      interestEarned: interestEarned || 0
    };
  };

  // Income Tax Calculator (New Zealand 2025 tax brackets)
  const incomeAmount = ref(0);
  const incomeFrequency = ref('year'); // hour, week, fortnight, month, year
  const hoursPerWeek = ref(40); // Hours worked per week
  const hasKiwiSaver = ref(false);
  const kiwiSaverRate = ref(3); // 3, 4, 6, 8, 10, or custom
  const hasStudentLoan = ref(false);
  const taxResult = ref(null);
  const taxWizardStep = ref(1); // Wizard step: 1=income, 2=deductions, 3=summary, 4=results
  const additionalAmount = ref(0); // Additional amount for marginal tax calculation

  // New Zealand tax brackets for 2025
  const NZ_TAX_BRACKETS_2025 = [
    { threshold: 14000, rate: 0.105 },
    { threshold: 48000, rate: 0.175 },
    { threshold: 70000, rate: 0.30 },
    { threshold: 180000, rate: 0.33 },
    { threshold: Infinity, rate: 0.39 },
  ];

  // ACC levy rate (2024-25 rate, approximate)
  const ACC_LEVY_RATE = 0.0139; // 1.39%

  // Student loan threshold (2024-25)
  const STUDENT_LOAN_THRESHOLD = 22828;
  const STUDENT_LOAN_RATE = 0.12; // 12%

  // Convert income to annual
  const convertToAnnual = (amount, frequency) => {
    const conversions = {
      hour: amount * hoursPerWeek.value * 52, // Use actual hours per week
      week: amount * 52,
      fortnight: amount * 26,
      month: amount * 12,
      year: amount
    };
    return conversions[frequency] || amount;
  };

  // Calculate progressive tax using NZ brackets
  const calculateProgressiveTax = (income, brackets = NZ_TAX_BRACKETS_2025) => {
    if (income <= 0) return 0;

    let remaining = income;
    let lastCut = 0;
    let tax = 0;

    for (const bracket of brackets) {
      // Income that sits inside this bracket
      const taxable = Math.min(remaining, bracket.threshold - lastCut);
      if (taxable <= 0) break;

      tax += taxable * bracket.rate;
      remaining -= taxable;
      lastCut = bracket.threshold;

      if (remaining <= 0) break;
    }
    return tax;
  };

  // Get marginal tax rate for "next $1"
  const getMarginalRate = (income, brackets = NZ_TAX_BRACKETS_2025) => {
    let lastThreshold = 0;

    for (const bracket of brackets) {
      if (income <= bracket.threshold) {
        return bracket.rate;
      }
      lastThreshold = bracket.threshold;
    }
    return brackets[brackets.length - 1].rate;
  };

  // Get effective (blended) rate
  const getEffectiveRate = (income, brackets = NZ_TAX_BRACKETS_2025) => {
    const tax = calculateProgressiveTax(income, brackets);
    if (income === 0) return 0;
    return tax / income;
  };

  // Calculate ACC levy
  const calculateACC = (annualIncome) => {
    return annualIncome * ACC_LEVY_RATE;
  };

  // Calculate student loan repayment
  const calculateStudentLoan = (annualIncome) => {
    if (!hasStudentLoan.value || annualIncome <= STUDENT_LOAN_THRESHOLD) {
      return 0;
    }
    return (annualIncome - STUDENT_LOAN_THRESHOLD) * STUDENT_LOAN_RATE;
  };

  // Calculate KiwiSaver contribution
  const calculateKiwiSaver = (annualIncome) => {
    if (!hasKiwiSaver.value) {
      return 0;
    }
    return annualIncome * (kiwiSaverRate.value / 100);
  };

  // Convert annual amount to different frequencies
  const convertFromAnnual = (annualAmount, frequency) => {
    const conversions = {
      hour: annualAmount / (hoursPerWeek.value * 52), // Use actual hours per week
      week: annualAmount / 52,
      fortnight: annualAmount / 26,
      month: annualAmount / 12,
      year: annualAmount
    };
    return conversions[frequency] || annualAmount;
  };

  const calculateTax = () => {
    if (!incomeAmount.value || incomeAmount.value <= 0) {
      return;
    }

    // Convert input income to annual
    const annualIncome = convertToAnnual(incomeAmount.value, incomeFrequency.value);
    
    // Calculate PAYE tax
    const payeTax = calculateProgressiveTax(annualIncome);
    
    // Calculate ACC levy
    const accLevy = calculateACC(annualIncome);
    
    // Calculate KiwiSaver
    const kiwiSaver = calculateKiwiSaver(annualIncome);
    
    // Calculate Student Loan
    const studentLoan = calculateStudentLoan(annualIncome);
    
    // Calculate take home pay
    const takeHomePay = annualIncome - payeTax - accLevy - kiwiSaver - studentLoan;
    
    // Get rates
    const marginalRate = getMarginalRate(annualIncome);
    const effectiveRate = getEffectiveRate(annualIncome);
    
    // Calculate breakdowns for all frequencies
    const frequencies = ['hour', 'week', 'fortnight', 'month', 'year'];
    const breakdown = {};
    
    frequencies.forEach(freq => {
      breakdown[freq] = {
        grossPay: convertFromAnnual(annualIncome, freq),
        paye: convertFromAnnual(payeTax, freq),
        acc: convertFromAnnual(accLevy, freq),
        kiwiSaver: convertFromAnnual(kiwiSaver, freq),
        studentLoan: convertFromAnnual(studentLoan, freq),
        takeHomePay: convertFromAnnual(takeHomePay, freq)
      };
    });

    taxResult.value = {
      annualGrossPay: annualIncome,
      annualTakeHomePay: takeHomePay,
      payeTax: payeTax || 0,
      accLevy: accLevy || 0,
      kiwiSaver: kiwiSaver || 0,
      studentLoan: studentLoan || 0,
      marginalRate: (marginalRate * 100).toFixed(1),
      effectiveRate: (effectiveRate * 100).toFixed(2),
      breakdown: breakdown
    };
  };

  // Buy Now Pay Later Calculator
  const bnplAmount = ref(0);
  const bnplPayments = ref(4);
  const bnplInterestRate = ref(0);
  const bnplFee = ref(0);
  const bnplLateFee = ref(0);
  const bnplResult = ref(null);

  const calculateBNPL = () => {
    if (!bnplAmount.value || !bnplPayments.value) {
      return;
    }

    const principal = bnplAmount.value;
    const payments = bnplPayments.value;
    const interestRate = (bnplInterestRate.value || 0) / 100;
    const feePerPayment = bnplFee.value || 0;
    const lateFee = bnplLateFee.value || 0;

    // Calculate payment per installment
    // If interest-free, just divide principal + fees
    // If interest-bearing, calculate with compound interest
    let paymentPerInstallment;
    let totalInterest = 0;

    if (interestRate === 0) {
      // Interest-free: principal + fees divided by payments
      paymentPerInstallment = (principal + (feePerPayment * payments)) / payments;
    } else {
      // Interest-bearing: calculate with compound interest
      const monthlyRate = interestRate / payments; // Approximate
      const paymentAmount = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, payments)) / 
        (Math.pow(1 + monthlyRate, payments) - 1);
      paymentPerInstallment = paymentAmount + feePerPayment;
      totalInterest = (paymentAmount * payments) - principal;
    }

    const totalFees = feePerPayment * payments;
    const totalCost = principal + totalInterest + totalFees;
    const extraCost = totalCost - principal;

    bnplResult.value = {
      paymentPerInstallment: paymentPerInstallment || 0,
      totalFees: totalFees || 0,
      totalInterest: totalInterest || 0,
      totalCost: totalCost || 0,
      extraCost: extraCost || 0
    };
  };

  // Budget Breakdown Helper
  const monthlyIncome = ref(0);
  const essentialExpenses = ref(0);
  const savingsGoalMonthly = ref(0);
  const budgetResult = ref(null);

  const calculateBudget = () => {
    if (!monthlyIncome.value) {
      return;
    }

    const income = monthlyIncome.value;
    const essentials = essentialExpenses.value || 0;
    const savings = savingsGoalMonthly.value || 0;

    const disposableIncome = income - essentials;
    const remainingAfterSavings = disposableIncome - savings;
    const perWeek = remainingAfterSavings / 4.33; // Average weeks per month
    const perDay = perWeek / 7;

    budgetResult.value = {
      disposableIncome: disposableIncome || 0,
      perWeek: perWeek || 0,
      perDay: perDay || 0,
      remainingAfterSavings: remainingAfterSavings || 0
    };
  };

  // Emergency Fund Calculator
  const monthlyExpenses = ref(0);
  const emergencyMonths = ref(6);
  const currentEmergencyFund = ref(0);
  const emergencyResult = ref(null);

  const calculateEmergencyFund = () => {
    if (!monthlyExpenses.value || !emergencyMonths.value) {
      return;
    }

    const expenses = monthlyExpenses.value;
    const months = emergencyMonths.value;
    const current = currentEmergencyFund.value || 0;

    const targetFund = expenses * months;
    const stillNeed = Math.max(0, targetFund - current);

    emergencyResult.value = {
      targetFund: targetFund || 0,
      currentFund: current || 0,
      stillNeed: stillNeed || 0
    };
  };

  // Utility function to format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0.00';
    }
    return Number(amount).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return {
    // Loan calculator
    loanAmount,
    loanInterestRate,
    loanTermYears,
    loanResult,
    calculateLoan,
    
    // Savings calculator
    savingsGoal,
    currentSavings,
    savingsMonths,
    savingsInterestRate,
    savingsResult,
    calculateSavings,
    
    // Tax calculator
    incomeAmount,
    incomeFrequency,
    hoursPerWeek,
    hasKiwiSaver,
    kiwiSaverRate,
    hasStudentLoan,
    taxResult,
    taxWizardStep,
    additionalAmount,
    calculateTax,
    
    // BNPL calculator
    bnplAmount,
    bnplPayments,
    bnplInterestRate,
    bnplFee,
    bnplLateFee,
    bnplResult,
    calculateBNPL,
    
    // Budget calculator
    monthlyIncome,
    essentialExpenses,
    savingsGoalMonthly,
    budgetResult,
    calculateBudget,
    
    // Emergency fund calculator
    monthlyExpenses,
    emergencyMonths,
    currentEmergencyFund,
    emergencyResult,
    calculateEmergencyFund,
    
    // Utility functions
    formatCurrency
  };
}

