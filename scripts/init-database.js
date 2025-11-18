#!/usr/bin/env node

/**
 * Initialize the database by importing the database module
 */

console.log('Initializing database...');

// This will trigger database initialization
require('../lib/database.ts');

console.log('Database initialized successfully!');
