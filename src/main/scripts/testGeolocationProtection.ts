/**
 * 地理位置防护测试脚本
 * 用于测试和验证地理位置泄露防护效果
 */

import { leakProtectionManager } from '../services/leakProtectionManager';

/**
 * 执行地理位置防护测试
 */
async function testGeolocationProtection(): Promise<void> {
  console.log('=== 地理位置防护测试开始 ===');
  
  try {
    // 1. 应用全面的地理位置防护
    console.log('\n1. 应用全面的地理位置防护...');
    const protectionResult = await leakProtectionManager.applyComprehensiveGeolocationProtection();
    console.log(`防护应用结果: ${protectionResult ? '✅ 成功' : '❌ 失败'}`);
    
    // 2. 执行地理位置泄露测试
    console.log('\n2. 执行地理位置泄露测试...');
    const testResult = await leakProtectionManager.runGeolocationLeakTest();
    
    console.log(`\n=== 测试结果 ===`);
    console.log(`总体评分: ${testResult.overallScore}/100`);
    console.log(`测试项目数: ${testResult.tests.length}`);
    
    // 显示每个测试的详细结果
    console.log('\n=== 详细测试结果 ===');
    testResult.tests.forEach((test, index) => {
      const status = test.success ? '✅' : '❌';
      console.log(`${index + 1}. ${test.name}: ${status} (${test.score}/100)`);
      console.log(`   描述: ${test.description}`);
      if (test.result.message) {
        console.log(`   结果: ${test.result.message}`);
      }
      if (test.result.error) {
        console.log(`   错误: ${test.result.error}`);
      }
      console.log('');
    });
    
    // 显示改进建议
    console.log('=== 改进建议 ===');
    testResult.recommendations.forEach((recommendation, index) => {
      console.log(`${index + 1}. ${recommendation}`);
    });
    
    // 3. 获取防护状态
    console.log('\n3. 获取防护状态...');
    const protectionStatus = leakProtectionManager.getGeolocationProtectionStatus();
    console.log('防护状态:', JSON.stringify(protectionStatus, null, 2));
    
    // 4. 获取测试历史
    console.log('\n4. 获取测试历史...');
    const testHistory = leakProtectionManager.getGeolocationTestHistory();
    console.log(`测试历史记录数: ${testHistory.length}`);
    
    console.log('\n=== 地理位置防护测试完成 ===');
    
  } catch (error) {
    console.error('地理位置防护测试失败:', error);
  }
}


// 如果直接运行此脚本
if (require.main === module) {
  testGeolocationProtection().then(() => {
    console.log('测试脚本执行完成');
    process.exit(0);
  }).catch((error) => {
    console.error('测试脚本执行失败:', error);
    process.exit(1);
  });
}
