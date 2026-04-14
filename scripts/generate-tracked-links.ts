/**
 * Generate Tracked Links for Cold Email Campaigns
 * 
 * Usage:
 *   npx tsx scripts/generate-tracked-links.ts --campaign us_texas_wave1 --content email_1 --csv prospects.csv
 *   npx tsx scripts/generate-tracked-links.ts --campaign us_texas_wave1 --content email_1 --single "john@printshop.com" "PrintShop Texas" "John"
 * 
 * Input CSV format (from Outscraper):
 *   email,company,name,city,state
 *   john@printshop.com,PrintShop Texas,John Smith,Houston,TX
 * 
 * Output: CSV with columns: email, company, short_link, full_redirect_url
 *         Ready to import into Instantly as custom variables.
 * 
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *   - Migration 015 applied (tracked_links table exists)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'path';

// Load .env if running locally
try {
  const envFile = readFileSync('.env', 'utf-8');
  for (const line of envFile.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
} catch { /* no .env file */ }

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

// Default destination for cold email links
const DEFAULT_DESTINATION = '/demo/builder';
const BASE_URL = 'https://dtflayout.com';

// Short code generation (matches DB function)
const CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';
function generateCode(len = 8): string {
  let result = '';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) {
    result += CHARS[bytes[i] % CHARS.length];
  }
  return result;
}

interface Prospect {
  email: string;
  company: string;
  name?: string;
  city?: string;
  state?: string;
}

interface GeneratedLink {
  email: string;
  company: string;
  name: string;
  short_link: string;
  code: string;
}

async function generateLink(
  prospect: Prospect,
  campaign: string,
  content: string,
  destination: string,
  batchId: string,
): Promise<GeneratedLink> {
  const code = generateCode();
  
  const { error } = await supabase.from('tracked_links').insert({
    code,
    destination_url: destination,
    utm_source: 'instantly',
    utm_medium: 'email',
    utm_campaign: campaign,
    utm_content: content,
    prospect_email: prospect.email,
    prospect_company: prospect.company,
    prospect_name: prospect.name || null,
    prospect_city: prospect.city || null,
    prospect_state: prospect.state || null,
    batch_id: batchId,
  });
  
  if (error) {
    // Retry with new code on unique constraint violation
    if (error.code === '23505') {
      return generateLink(prospect, campaign, content, destination, batchId);
    }
    throw new Error(`Failed to insert link for ${prospect.email}: ${error.message}`);
  }
  
  return {
    email: prospect.email,
    company: prospect.company,
    name: prospect.name || '',
    short_link: `${BASE_URL}/go/${code}`,
    code,
  };
}

function parseCSV(content: string): Prospect[] {
  const lines = content.trim().split('\n');
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  
  const emailIdx = header.findIndex(h => h === 'email' || h === 'e-mail');
  const companyIdx = header.findIndex(h => h === 'company' || h === 'business_name' || h === 'name_of_business');
  const nameIdx = header.findIndex(h => h === 'name' || h === 'contact_name' || h === 'full_name');
  const cityIdx = header.findIndex(h => h === 'city');
  const stateIdx = header.findIndex(h => h === 'state');
  
  if (emailIdx === -1) throw new Error('CSV must have an "email" column');
  if (companyIdx === -1) throw new Error('CSV must have a "company" column');
  
  return lines.slice(1).filter(Boolean).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    return {
      email: cols[emailIdx],
      company: cols[companyIdx],
      name: nameIdx >= 0 ? cols[nameIdx] : undefined,
      city: cityIdx >= 0 ? cols[cityIdx] : undefined,
      state: stateIdx >= 0 ? cols[stateIdx] : undefined,
    };
  }).filter(p => p.email && p.email.includes('@'));
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  
  const campaign = getArg('--campaign');
  const content = getArg('--content') || 'email_1';
  const csvPath = getArg('--csv');
  const destination = getArg('--dest') || DEFAULT_DESTINATION;
  const isSingle = args.includes('--single');
  
  if (!campaign) {
    console.error('Usage:');
    console.error('  Bulk:   npx tsx scripts/generate-tracked-links.ts --campaign us_texas_wave1 --content email_1 --csv prospects.csv');
    console.error('  Single: npx tsx scripts/generate-tracked-links.ts --campaign us_texas_wave1 --content email_1 --single "email" "company" "name"');
    console.error('');
    console.error('Options:');
    console.error('  --campaign  Campaign name (required)');
    console.error('  --content   Email variant, e.g. email_1 (default: email_1)');
    console.error('  --csv       Path to prospects CSV');
    console.error('  --dest      Destination path (default: /demo/builder)');
    console.error('  --single    Generate one link: email company [name]');
    process.exit(1);
  }
  
  const batchId = `${campaign}_${content}_${Date.now()}`;
  let prospects: Prospect[];
  
  if (isSingle) {
    const singleIdx = args.indexOf('--single');
    prospects = [{
      email: args[singleIdx + 1],
      company: args[singleIdx + 2],
      name: args[singleIdx + 3],
    }];
  } else if (csvPath) {
    const csvContent = readFileSync(csvPath, 'utf-8');
    prospects = parseCSV(csvContent);
  } else {
    console.error('Provide either --csv or --single');
    process.exit(1);
  }
  
  console.log(`Generating ${prospects.length} tracked links...`);
  console.log(`  Campaign: ${campaign}`);
  console.log(`  Content:  ${content}`);
  console.log(`  Dest:     ${destination}`);
  console.log(`  Batch:    ${batchId}`);
  console.log('');
  
  const results: GeneratedLink[] = [];
  let errors = 0;
  
  for (const prospect of prospects) {
    try {
      const link = await generateLink(prospect, campaign, content, destination, batchId);
      results.push(link);
      process.stdout.write(`  ✓ ${link.email} → ${link.short_link}\n`);
    } catch (err) {
      errors++;
      console.error(`  ✗ ${prospect.email}: ${(err as Error).message}`);
    }
  }
  
  // Output CSV for Instantly import
  if (results.length > 0) {
    const outputName = `tracked-links_${campaign}_${content}.csv`;
    const csvOutput = [
      'email,company,name,tracked_link',
      ...results.map(r => `"${r.email}","${r.company}","${r.name}","${r.short_link}"`),
    ].join('\n');
    
    writeFileSync(outputName, csvOutput);
    console.log(`\n✅ Generated ${results.length} links (${errors} errors)`);
    console.log(`📄 Output: ${outputName}`);
    console.log(`\nIn Instantly, use {{tracked_link}} as a merge variable in your email template.`);
  }
}

main().catch(console.error);
