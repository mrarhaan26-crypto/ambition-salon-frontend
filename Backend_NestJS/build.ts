"""
Build script for Ambition Unisex Salon Backend.

This script:
1. Generates Prisma client
2. Runs TypeScript compilation
"""

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname);
console.log('Building Ambition Unisex Salon Backend...');

// Step 1: Generate Prisma client
console.log('\n1. Generating Prisma client...');
try {
  execSync('npx prisma generate', { cwd: workspaceRoot, stdio: 'inherit' });
  console.log('✓ Prisma client generated successfully');
} catch (error) {
  console.error('✗ Failed to generate Prisma client:', error);
  process.exit(1);
}

// Step 2: Build the application
console.log('\n2. Building NestJS application...');
try {
  execSync('npx nest build', { cwd: workspaceRoot, stdio: 'inherit' });
  console.log('✓ Application built successfully');
} catch (error) {
  console.error('✗ Failed to build application:', error);
  process.exit(1);
}

console.log('\n✅ Build completed successfully!');
