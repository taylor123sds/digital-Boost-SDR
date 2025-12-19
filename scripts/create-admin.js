#!/usr/bin/env node
/**
 * @file create-admin.js
 * @description Create initial admin user for the dashboard
 *
 * Usage: node scripts/create-admin.js [email] [password] [name]
 * Example: node scripts/create-admin.js admin@orbion.ai senha123 "Admin User"
 */

import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../orbion.db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function createAdmin() {
  console.log('\n=================================');
  console.log('  LEADLY - Create Admin User');
  console.log('=================================\n');

  let email = process.argv[2];
  let password = process.argv[3];
  let name = process.argv[4];

  // Interactive mode if no arguments
  if (!email) {
    email = await question('Email: ');
  }
  if (!password) {
    password = await question('Password (min 6 chars): ');
  }
  if (!name) {
    name = await question('Full Name: ');
  }

  // Validation
  if (!email || !email.includes('@')) {
    console.error('\n Error: Invalid email address');
    rl.close();
    process.exit(1);
  }

  if (!password || password.length < 6) {
    console.error('\n Error: Password must be at least 6 characters');
    rl.close();
    process.exit(1);
  }

  if (!name || name.length < 2) {
    console.error('\n Error: Name is required');
    rl.close();
    process.exit(1);
  }

  rl.close();

  try {
    const db = new Database(dbPath);

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      console.error(`\n Error: User with email "${email}" already exists`);
      db.close();
      process.exit(1);
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create admin user
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 1, datetime('now'), datetime('now'))
    `);

    stmt.run(userId, email, passwordHash, name);

    console.log('\n Admin user created successfully!');
    console.log('   ─────────────────────────────');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: admin`);
    console.log('   ─────────────────────────────');
    console.log('\nYou can now login at: http://localhost:3001/login.html\n');

    db.close();
    process.exit(0);

  } catch (error) {
    console.error('\n Error creating user:', error.message);
    process.exit(1);
  }
}

createAdmin();
