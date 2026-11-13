/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const testQuestions = [
  'How much could a 1-bedroom in Dupont Circle make?',
  'What about a private room in Georgetown at 15 nights?',
  'Compare Dupont Circle and Capitol Hill',
  'How much could I make?',
  'What could a 2-bedroom in Arlington make?',
  'Who owns the most expensive listing?',
  'How do I report Airbnb income on taxes?',
];

async function runToolTests() {
  console.log('=== RUNNING ESTIMATE_EARNINGS TOOL TESTS ===\n');
  const results: any[] = [];

  for (const question of testQuestions) {
    const t0 = Date.now();
    try {
      const res = await fetch('http://localhost:3000/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          userScenario: {
            neighborhood: 'Capitol Hill, DC',
            pin: { lat: 38.8899, lng: -76.9961 },
            nights: 11,
            spaceType: 'entire_home',
            bedrooms: '1',
          },
        }),
      });

      const data = await res.json();
      const elapsed = Date.now() - t0;
      results.push({
        question,
        stepUsed: data.stepUsed,
        sourcesUsed: data.sourcesUsed || [],
        mapActions: data.mapActions || [],
        answer: data.answer || data.error || '',
        elapsed,
      });

      console.log(`Q: ${question}`);
      console.log(`   Step: ${data.stepUsed} | Sources: ${JSON.stringify(data.sourcesUsed || [])} | MapActions: ${data.mapActions?.length || 0}`);
      console.log(`   Answer: ${data.answer}\n`);
    } catch (err) {
      console.error(`Error testing "${question}":`, err);
    }
  }

  console.log('\n=== TEST SUMMARY TABLE (Markdown) ===\n');
  console.log('| Question | Step Used | Sources Used | Map Action | Answer |');
  console.log('| :--- | :---: | :--- | :---: | :--- |');
  for (const r of results) {
    const cleanAnswer = r.answer.replace(/\n+/g, ' ').slice(0, 140);
    const mapActionText = r.mapActions?.length > 0 ? `${r.mapActions.length} location(s)` : 'none';
    console.log(`| ${r.question} | Step ${r.stepUsed} | \`${r.sourcesUsed.join(', ')}\` | ${mapActionText} | ${cleanAnswer}... |`);
  }
}

runToolTests();
