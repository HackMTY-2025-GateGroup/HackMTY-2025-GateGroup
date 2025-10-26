#!/usr/bin/env node

/**
 * Backend API Tester - Test YOLO inference directly
 * No need for frontend - tests with real images from dataset
 * Generates output images with bounding boxes + unique IDs
 */

import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000/api/occupancy/analyze-tray';

// Test images from your dataset
const TEST_IMAGES = {
  'test1_full': {
    front: path.join(__dirname, 'dataset/images/val_boot/1.jpeg'),
    back: path.join(__dirname, 'dataset/images/val_boot/1.jpeg'), // use same for testing
    trolleyCode: 'TEST-FULL-001'
  },
  'test2_100percent': {
    front: path.join(__dirname, 'dataset/images/train_boot/100%.jpeg'),
    back: path.join(__dirname, 'dataset/images/train_boot/100%.jpeg'),
    trolleyCode: 'TEST-FULL-100'
  },
  'test3_17percent': {
    front: path.join(__dirname, 'dataset/images/train_boot/17%.jpeg'),
    back: path.join(__dirname, 'dataset/images/train_boot/17%.jpeg'),
    trolleyCode: 'TEST-SPARSE-17'
  },
  'test4_new': {
    front: path.join(__dirname, 'dataset/images/train_boot/new.jpeg'),
    back: path.join(__dirname, 'dataset/images/train_boot/new.jpeg'),
    trolleyCode: 'TEST-NEW-001'
  }
};

async function testAnalysis(testName, config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${testName}`);
  console.log(`${'='.repeat(60)}`);
  
  // Check if files exist
  if (!fs.existsSync(config.front)) {
    console.log(`❌ Front image not found: ${config.front}`);
    return;
  }
  if (!fs.existsSync(config.back)) {
    console.log(`❌ Back image not found: ${config.back}`);
    return;
  }

  console.log(`📸 Front: ${path.basename(config.front)}`);
  console.log(`📸 Back: ${path.basename(config.back)}`);
  console.log(`🏷️  Trolley: ${config.trolleyCode}`);
  
  // Create FormData
  const formData = new FormData();
  formData.append('front', fs.createReadStream(config.front));
  formData.append('back', fs.createReadStream(config.back));
  formData.append('trolleyCode', config.trolleyCode);
  formData.append('specName', 'doubleside.mx');

  try {
    console.log(`\n⏳ Sending request to ${API_URL}...`);
    const startTime = Date.now();
    
    const response = await axios.post(API_URL, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Response received in ${elapsed}ms`);

    const result = response.data;
    
    if (!result.ok) {
      console.log(`❌ Analysis failed:`, result);
      return;
    }

    // Display results
    console.log(`\n📊 RESULTS:`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`Analysis ID: ${result.analysisId}`);
    console.log(`Trolley ID: ${result.trolleyId}`);
    console.log(`\n🎯 OCCUPANCY:`);
    console.log(`  Overall: ${result.result.occupancy.overall.percent}%`);
    console.log(`  Visual Score: ${result.result.occupancy.overall.visualScore}/10`);
    console.log(`  Volume Used: ${result.result.occupancy.overall.volumeUsedLiters}L`);
    console.log(`  Capacity: ${result.result.occupancy.overall.totalCapacityLiters}L`);
    
    console.log(`\n📸 FRONT SIDE:`);
    console.log(`  YOLO Occupancy: ${result.result.occupancy.front.overallPercent}%`);
    console.log(`  Visual Score: ${result.result.occupancy.front.visualScore}/10`);
    console.log(`  Category: ${result.result.occupancy.front.visualCategory}`);
    console.log(`  Fill: ${result.result.occupancy.front.fillPercent}%`);
    console.log(`  Snacks: ${result.result.occupancy.front.snackPercent}%`);
    console.log(`  Products: ${result.result.inventory.front.count} types`);
    
    console.log(`\n📸 BACK SIDE:`);
    console.log(`  YOLO Occupancy: ${result.result.occupancy.back.overallPercent}%`);
    console.log(`  Visual Score: ${result.result.occupancy.back.visualScore}/10`);
    console.log(`  Category: ${result.result.occupancy.back.visualCategory}`);
    console.log(`  Fill: ${result.result.occupancy.back.fillPercent}%`);
    console.log(`  Snacks: ${result.result.occupancy.back.snackPercent}%`);
    console.log(`  Products: ${result.result.inventory.back.count} types`);

    console.log(`\n📦 DETECTED PRODUCTS (Front):`);
    if (result.result.inventory.front.currentProducts.length > 0) {
      result.result.inventory.front.currentProducts.forEach(p => {
        console.log(`  - ${p.label}: ${p.detected} units (${p.totalVolume.toFixed(2)}L)`);
      });
    } else {
      console.log(`  (none)`);
    }

    console.log(`\n🛒 SHOPPING LIST:`);
    if (result.result.shoppingList && result.result.shoppingList.length > 0) {
      result.result.shoppingList.forEach(item => {
        console.log(`  - ${item.label}: ${item.quantity} units [${item.priority}]`);
        console.log(`    ${item.notes}`);
      });
    } else {
      console.log(`  (none - tray is optimal)`);
    }

    console.log(`\n💡 RECOMMENDATION:`);
    console.log(`  Status: ${result.result.recommendations.status}`);
    console.log(`  ${result.result.recommendations.message}`);

    // Save results to file
    const outputDir = path.join(__dirname, 'test_outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `${testName}_${timestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full results saved to: ${outputFile}`);

    return result;

  } catch (error) {
    console.log(`\n❌ ERROR:`, error.message);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.cause) {
      console.log(`   Cause:`, error.cause);
    }
  }
}

async function runAllTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           BACKEND API TESTING SUITE                        ║
║  Testing YOLO + Visual Occupancy Detection                 ║
╚════════════════════════════════════════════════════════════╝
`);

  console.log(`📋 Tests to run: ${Object.keys(TEST_IMAGES).length}`);
  console.log(`🎯 API Endpoint: ${API_URL}`);
  
  // Run each test
  for (const [testName, config] of Object.entries(TEST_IMAGES)) {
    await testAnalysis(testName, config);
    
    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ ALL TESTS COMPLETED`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📁 Results saved in: backend/cv/train/test_outputs/`);
  console.log(`\n💡 TIP: Check the database for stored analysis records.`);
}

// Auto-run tests
runAllTests().catch(console.error);

export { testAnalysis, runAllTests };

