#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

class BundleAnalyzer {
  constructor() {
    this.buildDir = join(projectRoot, 'build');
    this.outputDir = join(projectRoot, 'perf-data/bundles');
    this.timestamp = new Date().toISOString();

    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  analyzeBundle() {
    if (!existsSync(this.buildDir)) {
      throw new Error('Build directory not found. Run "npm run build" first.');
    }

    const analysis = {
      timestamp: this.timestamp,
      commit: this.getCommitHash(),
      files: this.analyzeFiles(),
      totals: {},
      staticData: this.analyzeStaticData(),
      recommendations: []
    };

    analysis.totals = this.calculateTotals(analysis.files);
    analysis.recommendations = this.generateRecommendations(analysis);

    this.saveAnalysis(analysis);
    this.updateHistory(analysis);

    return analysis;
  }

  getCommitHash() {
    try {
      return execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  analyzeFiles() {
    const files = [];
    this.walkDirectory(this.buildDir, (filePath, stats) => {
      const relativePath = filePath.replace(this.buildDir, '');
      const content = readFileSync(filePath);
      const gzipSize = gzipSync(content).length;

      files.push({
        path: relativePath,
        size: stats.size,
        gzipSize,
        type: this.getFileType(relativePath),
        compressionRatio: (gzipSize / stats.size * 100).toFixed(1)
      });
    });

    return files.sort((a, b) => b.size - a.size);
  }

  analyzeStaticData() {
    const staticDataFiles = [
      '_app/immutable/assets/categories.json',
      '_app/immutable/assets/search-index.json'
    ];

    const analysis = {
      files: [],
      totalSize: 0,
      totalGzipSize: 0
    };

    for (const file of staticDataFiles) {
      const fullPath = join(this.buildDir, file);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath);
        const gzipSize = gzipSync(content).length;

        analysis.files.push({
          name: file,
          size: content.length,
          gzipSize,
          compressionRatio: (gzipSize / content.length * 100).toFixed(1)
        });

        analysis.totalSize += content.length;
        analysis.totalGzipSize += gzipSize;
      }
    }

    return analysis;
  }

  walkDirectory(dir, callback) {
    const fs = await import('fs');
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        this.walkDirectory(fullPath, callback);
      } else {
        callback(fullPath, stats);
      }
    }
  }

  getFileType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const typeMap = {
      'js': 'javascript',
      'mjs': 'javascript',
      'css': 'stylesheet',
      'html': 'document',
      'json': 'data',
      'svg': 'image',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'webp': 'image',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font'
    };
    return typeMap[ext] || 'other';
  }

  calculateTotals(files) {
    const totals = {
      count: files.length,
      size: 0,
      gzipSize: 0,
      byType: {}
    };

    for (const file of files) {
      totals.size += file.size;
      totals.gzipSize += file.gzipSize;

      if (!totals.byType[file.type]) {
        totals.byType[file.type] = { count: 0, size: 0, gzipSize: 0 };
      }

      totals.byType[file.type].count++;
      totals.byType[file.type].size += file.size;
      totals.byType[file.type].gzipSize += file.gzipSize;
    }

    return totals;
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    const { totals, staticData } = analysis;

    // Bundle size recommendations
    if (totals.size > 1024 * 1024) { // 1MB
      recommendations.push({
        type: 'warning',
        category: 'bundle-size',
        message: `Total bundle size (${this.formatBytes(totals.size)}) exceeds 1MB threshold`,
        suggestion: 'Consider code splitting and lazy loading for non-critical resources'
      });
    }

    // JavaScript size recommendations
    const jsSize = totals.byType.javascript?.size || 0;
    if (jsSize > 400 * 1024) { // 400KB
      recommendations.push({
        type: 'warning',
        category: 'javascript',
        message: `JavaScript bundle size (${this.formatBytes(jsSize)}) is large`,
        suggestion: 'Consider tree shaking, code splitting, and removing unused dependencies'
      });
    }

    // Static data recommendations
    if (staticData.totalSize > 500 * 1024) { // 500KB
      recommendations.push({
        type: 'info',
        category: 'static-data',
        message: `Static data files (${this.formatBytes(staticData.totalSize)}) are significant`,
        suggestion: 'Consider data pagination, lazy loading, or compression optimization'
      });
    }

    // Compression recommendations
    const avgCompressionRatio = totals.gzipSize / totals.size * 100;
    if (avgCompressionRatio > 40) {
      recommendations.push({
        type: 'info',
        category: 'compression',
        message: `Average compression ratio (${avgCompressionRatio.toFixed(1)}%) could be improved`,
        suggestion: 'Enable Brotli compression and optimize compressible assets'
      });
    }

    return recommendations;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  saveAnalysis(analysis) {
    const filename = `bundle-analysis-${this.timestamp.replace(/[:.]/g, '-')}.json`;
    const filePath = join(this.outputDir, filename);
    writeFileSync(filePath, JSON.stringify(analysis, null, 2));

    // Also save as latest
    const latestPath = join(this.outputDir, 'latest.json');
    writeFileSync(latestPath, JSON.stringify(analysis, null, 2));

    console.log(`Bundle analysis saved to: ${filePath}`);
  }

  updateHistory(analysis) {
    const historyPath = join(this.outputDir, 'history.json');
    let history = [];

    if (existsSync(historyPath)) {
      try {
        history = JSON.parse(readFileSync(historyPath, 'utf8'));
      } catch (e) {
        console.warn('Could not parse history file, starting fresh');
      }
    }

    // Keep only essential data for history
    const historyEntry = {
      timestamp: analysis.timestamp,
      commit: analysis.commit,
      totals: analysis.totals,
      staticDataSize: analysis.staticData.totalSize,
      recommendationCount: analysis.recommendations.length
    };

    history.push(historyEntry);

    // Keep last 100 entries
    if (history.length > 100) {
      history = history.slice(-100);
    }

    writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }

  printSummary(analysis) {
    console.log('\n🎯 Bundle Analysis Summary');
    console.log('==========================');
    console.log(`📦 Total Size: ${this.formatBytes(analysis.totals.size)}`);
    console.log(`🗜️  Gzipped: ${this.formatBytes(analysis.totals.gzipSize)}`);
    console.log(`📁 Files: ${analysis.totals.count}`);
    console.log(`📊 Static Data: ${this.formatBytes(analysis.staticData.totalSize)}`);

    console.log('\n📋 By File Type:');
    for (const [type, data] of Object.entries(analysis.totals.byType)) {
      console.log(`  ${type}: ${data.count} files, ${this.formatBytes(data.size)}`);
    }

    if (analysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      for (const rec of analysis.recommendations) {
        const icon = rec.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} ${rec.message}`);
        console.log(`     ${rec.suggestion}`);
      }
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const analyzer = new BundleAnalyzer();
    const analysis = analyzer.analyzeBundle();
    analyzer.printSummary(analysis);
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

export default BundleAnalyzer;