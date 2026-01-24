#!/bin/bash

# Script to prepare the package for publishing
# This script runs all necessary build steps before publishing

set -e  # Exit on any error

echo "🚀 Preparing package for publishing..."
echo ""

# Check Node version
echo "📦 Checking Node version..."
node_version=$(node -v)
echo "   Using Node: $node_version"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
npm install
echo ""

# Create WebSocket stubs
echo "🔧 Creating WebSocket optional dependency stubs..."
npm run create-ws-stubs
echo ""

# Generate worklet bundle
echo "📦 Generating worklet bundle..."
npm run gen:worklet-bundle
echo ""

# Generate mobile bundle
echo "📦 Generating mobile bundle..."
npm run gen:mobile-bundle
echo ""

# Generate schemas and HRPC files
echo "📋 Generating schemas and HRPC files..."
npm run gen:schema
echo ""

# Build TypeScript declarations
echo "📝 Building TypeScript declarations..."
npm run build:types
echo ""

# Lint check
echo "🔍 Running linter..."
npm run lint
echo ""

echo "✅ All preparation steps completed successfully!"
echo ""
echo "📦 Package is ready for publishing."
echo "   Run 'npm publish --tag=latest' to publish."



