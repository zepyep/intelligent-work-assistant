#!/usr/bin/env node

/**
 * 测试增强AI功能脚本
 * 直接测试AI服务和核心功能，无需身份验证
 */

const researchService = require('./services/enhancedResearchService');
const searchService = require('./services/intelligentSearchService');

async function testEnhancedAI() {
    console.log('🧪 开始测试增强AI功能...\n');

    try {
        // 服务已经初始化为实例

        console.log('✅ 服务实例获取成功');
        console.log('研究服务类型:', typeof researchService);
        console.log('搜索服务类型:', typeof searchService);

        // 测试文本统计功能
        console.log('\n📊 测试文本统计功能:');
        const testText = `人工智能（AI）是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统。
        机器学习是AI的一个子集，它使用统计技术让计算机能够从数据中学习，而无需明确编程。
        深度学习是机器学习的一个更专门的子集，它使用多层神经网络来分析各种因素。`;

        const stats = researchService.calculateTextStatistics(testText);
        console.log('文本统计结果:', {
            字符数: stats.characters,
            单词数: stats.words,
            句子数: stats.sentences,
            段落数: stats.paragraphs
        });

        // 测试语言检测
        console.log('\n🌐 测试语言检测功能:');
        const detectedLanguage = researchService.detectLanguage(testText);
        console.log(`检测到的语言: ${detectedLanguage}`);

        // 测试查询扩展
        console.log('\n🔍 测试查询扩展功能:');
        const originalQuery = '人工智能';
        const expandedQuery = searchService.expandQuery(originalQuery);
        console.log(`原始查询: "${originalQuery}"`);
        console.log(`扩展查询: "${expandedQuery}"`);

        // 测试相似度计算
        console.log('\n📈 测试相似度计算功能:');
        const text1 = '人工智能和机器学习';
        const text2 = 'AI和ML技术应用';
        const similarity = searchService.calculateTextSimilarity(text1, text2);
        console.log(`"${text1}" 与 "${text2}" 的相似度: ${similarity}`);

        // 测试主题提取
        console.log('\n📝 测试主题提取功能:');
        const extractedTopics = researchService.extractMainTopics(testText);
        console.log('提取的主要主题:', extractedTopics);

        // 测试搜索结果融合
        console.log('\n🔗 测试搜索结果融合功能:');
        const mockResults1 = [
            { title: 'AI基础概念', score: 0.9, source: 'academic' },
            { title: '机器学习入门', score: 0.8, source: 'academic' }
        ];
        const mockResults2 = [
            { title: '深度学习实践', score: 0.85, source: 'web' },
            { title: 'AI应用案例', score: 0.75, source: 'web' }
        ];
        
        const fusedResults = searchService.fuseSearchResults([mockResults1, mockResults2], {
            maxResults: 3,
            diversityWeight: 0.2
        });
        console.log('融合后的搜索结果:');
        fusedResults.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.title} (分数: ${result.finalScore})`);
        });

        console.log('\n✅ 所有功能测试完成！');
        console.log('🎉 增强AI功能运行正常');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误详情:', error.stack);
    }
}

// 运行测试
if (require.main === module) {
    testEnhancedAI();
}

module.exports = { testEnhancedAI };