/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateMonthlyCosts, calculateScenarios, calculateSetupPaybackMonths } from '../../lib/costs';
import { INITIAL_COST_ASSUMPTIONS, DEFAULT_COST_ITEMS } from '../../config/costs';
import { formatCurrency } from '../../lib/calc';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runCostTests() {
  console.log('--- Starting Costs & Profit Calculations Test Suite ---\n');

  // Test 1: Reference case (P = 200, N = 20, stay 5.2, cleaning fee 120 charged, hire cleaner, self-managed)
  console.log('Test 1: Reference Case (P=$200, N=20, stay=5.2, cleaning=$120 charged, hire cleaner, self-managed)');
  const res = calculateMonthlyCosts(20, 200, {
    ...INITIAL_COST_ASSUMPTIONS,
    managementType: 'self',
    cleanOption: 'cleaner',
    chargeCleaningFee: true,
    cleaningFeeAmount: 120,
    cleaningCostAmount: 120,
  });

  const stays = Math.round(res.staysCount * 100) / 100;
  const cleaningFeeIncome = Math.round(res.cleaningFeeIncome);
  const gross = Math.round(res.grossBookings);
  const airbnbFee = Math.round(res.airbnbFee);
  const cleaningCost = Math.round(res.cleaningCost);
  const utilities = Math.round(res.utilitiesCost);
  const supplies = Math.round(res.suppliesCost);
  const repairs = Math.round(res.repairsCost);
  const insurance = Math.round(res.insuranceCost);
  const license = Math.round(res.licenseCost);
  const total = Math.round(res.totalCosts);
  const net = Math.round(res.netBeforeHousing);
  const annual = Math.round(res.annualNetBeforeHousing);

  console.log(`stays: ${stays} (expected 3.85)`);
  console.log(`cleaningFeeIncome: ${cleaningFeeIncome} (expected $462)`);
  console.log(`gross: ${gross} (expected $4,462)`);
  console.log(`airbnbFee: ${airbnbFee} (expected $692)`);
  console.log(`cleaningCost: ${cleaningCost} (expected $462)`);
  console.log(`utilities: ${utilities} (expected $223)`);
  console.log(`supplies: ${supplies} (expected $89)`);
  console.log(`repairs: ${repairs} (expected $134)`);
  console.log(`insurance: ${insurance} (expected $28)`);
  console.log(`license: ${license} (expected $4)`);
  console.log(`total: ${total} (expected $1,632)`);
  console.log(`net: ${net} (expected $2,830)`);
  console.log(`annual: ${annual} (expected ~$33,958)`);

  assert(stays === 3.85, `Expected stays=3.85, got ${stays}`);
  assert(cleaningFeeIncome === 462, `Expected cleaning income $462, got ${cleaningFeeIncome}`);
  assert(gross === 4462, `Expected gross $4,462, got ${gross}`);
  assert(airbnbFee === 692, `Expected airbnb fee $692, got ${airbnbFee}`);
  assert(cleaningCost === 462, `Expected cleaning cost $462, got ${cleaningCost}`);
  assert(utilities === 223, `Expected utilities $223, got ${utilities}`);
  assert(supplies === 89, `Expected supplies $89, got ${supplies}`);
  assert(repairs === 134, `Expected repairs $134, got ${repairs}`);
  assert(insurance === 28, `Expected insurance $28, got ${insurance}`);
  assert(license === 4, `Expected license $4, got ${license}`);
  assert(total === 1632, `Expected total $1,632, got ${total}`);
  assert(net === 2830, `Expected net $2,830, got ${net}`);
  assert(annual === 33958, `Expected annual $33,958, got ${annual}`);
  console.log('✓ Test 1 passed: All reference numbers match specified figures down to the dollar!\n');

  // Test 2: Clean yourself scenario
  console.log('Test 2: Clean Yourself (cleaningCost = $0)');
  const resSelfClean = calculateMonthlyCosts(20, 200, {
    ...INITIAL_COST_ASSUMPTIONS,
    managementType: 'self',
    cleanOption: 'self',
    chargeCleaningFee: true,
    cleaningFeeAmount: 120,
  });
  const netSelfClean = Math.round(resSelfClean.netBeforeHousing);
  console.log(`netSelfClean: ${netSelfClean} (expected $3,291)`);
  assert(netSelfClean === 3291, `Expected clean yourself net $3,291, got ${netSelfClean}`);
  console.log('✓ Test 2 passed: Clean yourself net profit is $3,291/month\n');

  // Test 3: Co-host 10% scenario
  console.log('Test 3: Co-host 10%');
  const resCohost = calculateMonthlyCosts(20, 200, {
    ...INITIAL_COST_ASSUMPTIONS,
    managementType: 'cohost',
    cleanOption: 'cleaner',
    chargeCleaningFee: true,
    cleaningFeeAmount: 120,
    cleaningCostAmount: 120,
  });
  const netCohost = Math.round(resCohost.netBeforeHousing);
  console.log(`netCohost: ${netCohost} (expected $2,430)`);
  assert(netCohost === 2430, `Expected co-host 10% net $2,430, got ${netCohost}`);
  console.log('✓ Test 3 passed: Co-host 10% net profit is $2,430/month\n');

  // Test 4: Setup $3,000 payback
  console.log('Test 4: Setup $3,000 payback period');
  const payback = calculateSetupPaybackMonths(3000, res.netBeforeHousing);
  const roundedPayback = payback ? Math.round(payback * 10) / 10 : 0;
  console.log(`payback: ${roundedPayback} months (expected 1.1 months)`);
  assert(roundedPayback === 1.1, `Expected payback ≈ 1.1 months, got ${roundedPayback}`);
  console.log('✓ Test 4 passed: Setup payback is 1.1 months\n');

  // Test 5: Lodging tax is informational and never reduces host net
  console.log('Test 5: Lodging tax verification');
  assert(res.lodgingTaxAmount > 0, 'Lodging tax is calculated');
  assert(
    res.grossBookings - res.totalCosts === res.netBeforeHousing,
    'Net before housing is strictly gross bookings minus operating & fixed costs; lodging tax is never deducted from host payout'
  );
  console.log(`✓ Test 5 passed: Lodging tax is $${Math.round(res.lodgingTaxAmount)} paid by guests, $0 deducted from host\n`);

  // Test 6: Scenarios list helper
  console.log('Test 6: Scenario comparison card calculations');
  const scenarios = calculateScenarios(20, 200, INITIAL_COST_ASSUMPTIONS);
  assert(scenarios.length === 4, 'Should compute 4 scenarios');
  assert(Math.round(scenarios[0].monthlyNet) === 3291, 'Scenario 1 (run & clean) matches $3,291');
  assert(Math.round(scenarios[1].monthlyNet) === 2830, 'Scenario 2 (run & hire) matches $2,830');
  assert(Math.round(scenarios[2].monthlyNet) === 2430, 'Scenario 3 (co-host 10%) matches $2,430');
  console.log('✓ Test 6 passed: Scenarios helper returns all 4 comparative cards accurately\n');

  console.log('====================================================');
  console.log('ALL COSTS & PROFIT TESTS PASSED SUCCESSFULLY! (6/6)');
  console.log('====================================================');
}

runCostTests().catch((err) => {
  console.error('Costs test failed:', err);
  process.exit(1);
});
