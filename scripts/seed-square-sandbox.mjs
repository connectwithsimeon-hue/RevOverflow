/**
 * RevOverflow — Square Sandbox Seeder
 * Creates 40 realistic test customers + orders spread across the last 2 years.
 * Run once: node scripts/seed-square-sandbox.mjs
 */

const TOKEN = 'EAAAlxGXRJ8l0REt8eGNTMbEtarW377LjuACv5qfspOk0JnZzJBON9oCuf3sOnRt'
const BASE  = 'https://connect.squareupsandbox.com'
const HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Square-Version': '2024-01-17',
  'Content-Type': 'application/json',
}

function uid() {
  return crypto.randomUUID()
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Realistic small-business customers across all segments
// No phone numbers — Square sandbox rejects US test numbers
const CUSTOMERS = [
  // Loyal customers (many orders, recent)
  { name: ['Maria', 'Thompson'], email: 'maria.thompson@email.com', ordersAgo: [5, 18, 35, 62, 90, 120, 145, 200], amounts: [68, 92, 45, 78, 110, 55, 82, 99] },
  { name: ['James', 'Rivera'],   email: 'james.rivera@email.com',   ordersAgo: [3, 22, 41, 70, 95, 130, 160], amounts: [112, 88, 67, 145, 55, 90, 78] },
  { name: ['Priya', 'Kapoor'],   email: 'priya.kapoor@email.com',   ordersAgo: [8, 30, 55, 80, 110, 140], amounts: [44, 67, 89, 55, 102, 78] },
  { name: ['David', 'Chen'],     email: 'david.chen@email.com',     ordersAgo: [12, 28, 50, 75, 100], amounts: [95, 134, 67, 88, 112] },
  { name: ['Sofia', 'Martinez'], email: 'sofia.martinez@email.com', ordersAgo: [6, 25, 48, 72, 98, 125, 155, 180, 210], amounts: [55, 78, 92, 44, 110, 67, 83, 59, 95] },

  // Active customers (regular, recent)
  { name: ['Alex', 'Johnson'],   email: 'alex.johnson@email.com',   ordersAgo: [10, 45, 90], amounts: [78, 92, 65] },
  { name: ['Sarah', 'Williams'], email: 'sarah.w@email.com',        ordersAgo: [15, 50, 85], amounts: [45, 67, 88] },
  { name: ['Marcus', 'Brown'],   email: 'marcus.b@email.com',       ordersAgo: [20, 55, 95], amounts: [120, 78, 55] },
  { name: ['Linda', 'Davis'],    email: 'linda.davis@email.com',    ordersAgo: [7, 40], amounts: [67, 89] },
  { name: ['Kevin', 'Lee'],      email: 'kevin.lee@email.com',      ordersAgo: [25, 58], amounts: [88, 110] },
  { name: ['Nina', 'Patel'],     email: 'nina.patel@email.com',     ordersAgo: [18, 52, 88], amounts: [55, 72, 91] },
  { name: ['Omar', 'Hassan'],    email: 'omar.hassan@email.com',    ordersAgo: [30, 65], amounts: [144, 98] },

  // New customers (single order, recent)
  { name: ['Emma', 'Scott'],     email: 'emma.scott@email.com',     ordersAgo: [4],  amounts: [55] },
  { name: ['Tyler', 'Moore'],    email: 'tyler.moore@email.com',    ordersAgo: [9],  amounts: [88] },
  { name: ['Aisha', 'Jackson'],  email: 'aisha.j@email.com',        ordersAgo: [14], amounts: [42] },
  { name: ['Ryan', 'White'],     email: 'ryan.white@email.com',     ordersAgo: [21], amounts: [76] },
  { name: ['Fatima', 'Ali'],     email: 'fatima.ali@email.com',     ordersAgo: [28], amounts: [99] },

  // At-risk customers (went quiet 61-120 days ago)
  { name: ['Chris', 'Taylor'],   email: 'chris.taylor@email.com',   ordersAgo: [65, 120, 200], amounts: [88, 67, 55] },
  { name: ['Jessica', 'Anderson'], email: 'jess.a@email.com',       ordersAgo: [72, 130], amounts: [112, 89] },
  { name: ['Mike', 'Thomas'],    email: 'mike.thomas@email.com',    ordersAgo: [80, 145, 220], amounts: [67, 55, 78] },
  { name: ['Rachel', 'Garcia'],  email: 'rachel.g@email.com',       ordersAgo: [90, 160], amounts: [44, 92] },
  { name: ['Daniel', 'Martinez'],email: 'daniel.m@email.com',       ordersAgo: [100, 170, 240], amounts: [78, 110, 65] },
  { name: ['Amy', 'Robinson'],   email: 'amy.robinson@email.com',   ordersAgo: [110, 180], amounts: [55, 88] },

  // Lapsed customers (121-365 days ago)
  { name: ['Brian', 'Clark'],    email: 'brian.clark@email.com',    ordersAgo: [130, 250, 380], amounts: [92, 78, 55] },
  { name: ['Laura', 'Lewis'],    email: 'laura.lewis@email.com',    ordersAgo: [150, 280], amounts: [67, 110] },
  { name: ['Jason', 'Walker'],   email: 'jason.walker@email.com',   ordersAgo: [180, 310, 430], amounts: [88, 65, 79] },
  { name: ['Megan', 'Hall'],     email: 'megan.hall@email.com',     ordersAgo: [200, 350], amounts: [55, 92] },
  { name: ['Eric', 'Allen'],     email: 'eric.allen@email.com',     ordersAgo: [220, 370, 500], amounts: [78, 44, 99] },
  { name: ['Hannah', 'Young'],   email: 'hannah.y@email.com',       ordersAgo: [240, 390], amounts: [110, 67] },
  { name: ['Sam', 'King'],       email: 'sam.king@email.com',       ordersAgo: [300, 450], amounts: [88, 55] },

  // Lost customers (over a year ago)
  { name: ['Patricia', 'Wright'],email: 'pat.wright@email.com',     ordersAgo: [400, 550, 680], amounts: [78, 92, 65] },
  { name: ['Robert', 'Lopez'],   email: 'robert.lopez@email.com',   ordersAgo: [430, 600], amounts: [55, 88] },
  { name: ['Karen', 'Hill'],     email: 'karen.hill@email.com',     ordersAgo: [480, 630, 720], amounts: [110, 67, 45] },
  { name: ['Steven', 'Scott'],   email: 'steven.s@email.com',       ordersAgo: [520, 670], amounts: [88, 55] },
  { name: ['Dorothy', 'Green'],  email: 'dorothy.g@email.com',      ordersAgo: [580, 710], amounts: [67, 92] },
  { name: ['Paul', 'Adams'],     email: 'paul.adams@email.com',     ordersAgo: [620, 730, 650], amounts: [78, 55, 88] },
  { name: ['Betty', 'Baker'],    email: 'betty.baker@email.com',    ordersAgo: [680, 750], amounts: [44, 78] },
  { name: ['George', 'Nelson'],  email: 'george.n@email.com',       ordersAgo: [700], amounts: [99] },
]

async function sq(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) {
    console.error(`  ✗ ${method} ${path}`, JSON.stringify(json?.errors?.[0] || json))
    return null
  }
  return json
}

async function getOrCreateLocation() {
  const data = await sq('GET', '/v2/locations')
  const locations = data?.locations || []
  if (locations.length > 0) {
    console.log(`  ✓ Using location: ${locations[0].name} (${locations[0].id})`)
    return locations[0].id
  }
  console.log('  Creating a location...')
  const created = await sq('POST', '/v2/locations', {
    location: { name: 'Main Store', address: { postal_code: '10001' } }
  })
  return created?.location?.id
}

async function createCustomer(c) {
  const data = await sq('POST', '/v2/customers', {
    idempotency_key: uid(),
    given_name: c.name[0],
    family_name: c.name[1],
    email_address: c.email,
  })
  return data?.customer?.id
}

async function createOrder(locationId, customerId, amountCents, daysAgoN) {
  const data = await sq('POST', '/v2/orders', {
    idempotency_key: uid(),
    order: {
      location_id: locationId,
      customer_id: customerId,
      state: 'COMPLETED',
      line_items: [{
        name: 'Purchase',
        quantity: '1',
        base_price_money: { amount: amountCents, currency: 'USD' },
      }],
      closed_at: daysAgo(daysAgoN),
    },
  })
  return data?.order?.id
}

async function main() {
  console.log('RevOverflow — Square Sandbox Seeder\n')

  const locationId = await getOrCreateLocation()
  if (!locationId) { console.error('Could not get location. Check your token.'); process.exit(1) }

  let customerCount = 0
  let orderCount = 0

  for (const c of CUSTOMERS) {
    process.stdout.write(`  Creating ${c.name[0]} ${c.name[1]}... `)
    const customerId = await createCustomer(c)
    if (!customerId) { console.log('skipped'); continue }
    customerCount++

    for (let i = 0; i < c.ordersAgo.length; i++) {
      const amountCents = Math.round(c.amounts[i] * 100)
      await createOrder(locationId, customerId, amountCents, c.ordersAgo[i])
      orderCount++
      await new Promise(r => setTimeout(r, 500)) // rate limit courtesy
    }
    console.log(`✓ (${c.ordersAgo.length} orders)`)
  }

  console.log(`\nDone! Created ${customerCount} customers and ${orderCount} orders.`)
  console.log('Now go to revoverflow.com/dashboard and click "Connect Square" to sync.')
}

main().catch(console.error)
