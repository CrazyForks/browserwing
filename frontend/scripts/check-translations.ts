import { translations } from '../src/i18n/translations';

type TranslationKeys = Record<string, any>;

// 递归获取所有的 key 路径
function getAllKeys(obj: TranslationKeys, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys.sort();
}

// 比较两个语言的 keys
function compareKeys(lang1: string, keys1: string[], lang2: string, keys2: string[]): void {
  const set1 = new Set(keys1);
  const set2 = new Set(keys2);
  
  const onlyIn1 = keys1.filter(key => !set2.has(key));
  const onlyIn2 = keys2.filter(key => !set1.has(key));
  
  if (onlyIn1.length === 0 && onlyIn2.length === 0) {
    console.log(`✅ ${lang1} 和 ${lang2} 的翻译 key 完全一致`);
    return;
  }
  
  console.log(`\n❌ ${lang1} 和 ${lang2} 存在差异:\n`);
  
  if (onlyIn1.length > 0) {
    console.log(`📝 只存在于 ${lang1} 的 keys (共 ${onlyIn1.length} 个):`);
    onlyIn1.forEach(key => console.log(`  - ${key}`));
    console.log('');
  }
  
  if (onlyIn2.length > 0) {
    console.log(`📝 只存在于 ${lang2} 的 keys (共 ${onlyIn2.length} 个):`);
    onlyIn2.forEach(key => console.log(`  - ${key}`));
    console.log('');
  }
}

// 主函数
function checkTranslations() {
  console.log('🔍 开始检查翻译文件的完整性...\n');
  
  const languages = Object.keys(translations);
  console.log(`📚 发现的语言: ${languages.join(', ')}\n`);
  
  // 获取每个语言的所有 keys
  const languageKeys: Record<string, string[]> = {};
  
  for (const lang of languages) {
    languageKeys[lang] = getAllKeys(translations[lang as keyof typeof translations]);
    console.log(`${lang}: ${languageKeys[lang].length} 个 keys`);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // 两两比较
  let hasIssues = false;
  for (let i = 0; i < languages.length; i++) {
    for (let j = i + 1; j < languages.length; j++) {
      const lang1 = languages[i];
      const lang2 = languages[j];
      
      const keys1 = languageKeys[lang1];
      const keys2 = languageKeys[lang2];
      
      const set1 = new Set(keys1);
      const set2 = new Set(keys2);
      
      const onlyIn1 = keys1.filter(key => !set2.has(key));
      const onlyIn2 = keys2.filter(key => !set1.has(key));
      
      if (onlyIn1.length > 0 || onlyIn2.length > 0) {
        hasIssues = true;
      }
      
      compareKeys(lang1, keys1, lang2, keys2);
    }
  }
  
  console.log('='.repeat(80) + '\n');
  
  if (!hasIssues) {
    console.log('✅ 所有语言的翻译 key 都是完整的!');
    process.exit(0);
  } else {
    console.log('❌ 发现翻译缺失,请补充缺失的翻译!');
    process.exit(1);
  }
}

// 运行检查
checkTranslations();
