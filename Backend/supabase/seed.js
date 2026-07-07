/**
 * YouCollab — Database Seeder (Clerk-era)
 * =========================================================
 * Seeds the PostgreSQL tables with Pune-based brands, influencers,
 * gigs, applications, notifications, messages, and reviews.
 *
 * Authentication is handled by Clerk — this script touches the
 * DATABASE ONLY. Seeded users are created with clerk_user_id = NULL;
 * the first time someone signs in through Clerk with a matching email,
 * the backend automatically links (claims) the seeded record.
 *
 * Usage:
 *   node Backend/supabase/seed.js
 */

const path = require('path');
// Backend/.env first, repo-root .env as fallback (dotenv never overwrites)
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    '❌ DATABASE_URL is not set in your .env file.\n' +
    '   Format: postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres'
  );
  process.exit(1);
}

const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL database.');

    // ─── 1. Clean database tables ────────────────────────────────────
    console.log('\n🧹 Cleaning existing database records...');
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM reviews');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM applications');
    await client.query('DELETE FROM gigs');
    await client.query('DELETE FROM brands');
    await client.query('DELETE FROM influencers');
    await client.query('DELETE FROM users');

    // Users insert helper — Clerk-era schema (no passwords stored here)
    const createUser = async (email, fullName, role, avatarUrl) => {
      console.log(`   Creating user: ${email}`);
      const res = await client.query(
        `INSERT INTO users (clerk_user_id, email, full_name, role, is_onboarded, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [null, email, fullName, role, true, avatarUrl]
      );
      return res.rows[0].id;
    };

    // ─── 2. Insert Brand Users ───────────────────────────────────────
    console.log('\n👔 Seeding brand users...');

    const brandUser1Id = await createUser(
      'cafe@youcollab.in',
      'German Bakery',
      'BRAND',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150'
    );

    const brandUser2Id = await createUser(
      'urbanfit@youcollab.in',
      'UrbanFit Studio',
      'BRAND',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150'
    );

    // ─── 3. Insert Brand Profiles ────────────────────────────────────
    console.log('🏢 Inserting brand profiles...');

    const brand1Res = await client.query(
      `INSERT INTO brands ("userId", "businessName", category, location, bio, "logoUrl", website) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [
        brandUser1Id,
        'German Bakery',
        'Food & Beverage',
        'Koregaon Park, Pune',
        'Iconic Bakery in Pune offering delicious pastries, breakfast items, and organic foods. Looking to collaborate with foodies!',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150',
        'https://germanbakerypune.in'
      ]
    );
    const brand1Id = brand1Res.rows[0].id;

    const brand2Res = await client.query(
      `INSERT INTO brands ("userId", "businessName", category, location, bio, "logoUrl", website) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [
        brandUser2Id,
        'UrbanFit Studio',
        'Fitness & Wellness',
        'Baner, Pune',
        'Premium fitness studio in Baner offering CrossFit, Yoga, and personal training. Looking for fitness influencers!',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150',
        'https://urbanfitstudio.in'
      ]
    );
    const brand2Id = brand2Res.rows[0].id;

    // ─── 4. Insert Influencer Users ──────────────────────────────────
    console.log('\n🌟 Seeding influencer users...');

    const influencer1UserId = await createUser(
      'priya@youcollab.in',
      'Priya Sharma',
      'INFLUENCER',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    );

    const influencer2UserId = await createUser(
      'arjun@youcollab.in',
      'Arjun Mehta',
      'INFLUENCER',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    );

    const influencer3UserId = await createUser(
      'sneha@youcollab.in',
      'Sneha Kulkarni',
      'INFLUENCER',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
    );

    // ─── 5. Insert Influencer Profiles ───────────────────────────────
    console.log('📸 Inserting influencer profiles...');

    const influencer1Res = await client.query(
      `INSERT INTO influencers ("userId", name, "instagramHandle", niche, bio, "profileImageUrl", "followerCount") 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [
        influencer1UserId,
        'Priya Sharma',
        'priya_travels_pune',
        'Food',
        'Pune food & travel blogger. Showcasing the best cafes and street food in Pune.',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        45000
      ]
    );
    const influencer1Id = influencer1Res.rows[0].id;

    const influencer2Res = await client.query(
      `INSERT INTO influencers ("userId", name, "instagramHandle", niche, bio, "profileImageUrl", "followerCount") 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [
        influencer2UserId,
        'Arjun Mehta',
        'arjun_fitlife',
        'Fitness',
        'Fitness coach and content creator from Pune. Helping you get fit one reel at a time!',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        72000
      ]
    );
    const influencer2Id = influencer2Res.rows[0].id;

    const influencer3Res = await client.query(
      `INSERT INTO influencers ("userId", name, "instagramHandle", niche, bio, "profileImageUrl", "followerCount") 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [
        influencer3UserId,
        'Sneha Kulkarni',
        'sneha_styles',
        'Fashion',
        'Fashion and lifestyle content creator. Bringing Pune style to your feed ✨',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        38000
      ]
    );
    const influencer3Id = influencer3Res.rows[0].id;

    // ─── 6. Insert Gigs ──────────────────────────────────────────────
    console.log('\n🎯 Inserting gigs...');

    const gig1Res = await client.query(
      `INSERT INTO gigs ("brandId", title, description, "budgetMin", "budgetMax", deliverables, deadline, category, city, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id`,
      [
        brand1Id,
        'Koregaon Park Cafe Review',
        'Visit our bakery in Koregaon Park, try our new summer menu, and share a reel + story.',
        3000, 7000,
        '1 Reel, 2 Stories',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        'Food & Beverage', 'Pune', 'OPEN'
      ]
    );
    const gig1Id = gig1Res.rows[0].id;

    const gig2Res = await client.query(
      `INSERT INTO gigs ("brandId", title, description, "budgetMin", "budgetMax", deliverables, deadline, category, city, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id`,
      [
        brand1Id,
        'Pune Food Trail Feature',
        'Feature our bakery as part of your Pune food trail recommendations.',
        5000, 10000,
        '1 Youtube Video / Reel Integration',
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        'Food & Beverage', 'Pune', 'OPEN'
      ]
    );
    const gig2Id = gig2Res.rows[0].id;

    const gig3Res = await client.query(
      `INSERT INTO gigs ("brandId", title, description, "budgetMin", "budgetMax", deliverables, deadline, category, city, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id`,
      [
        brand2Id,
        'Fitness Transformation Challenge',
        'Join our 30-day fitness challenge at UrbanFit Baner. Document your journey on Instagram!',
        8000, 15000,
        '4 Reels, 8 Stories, 1 Blog Post',
        new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        'Fitness & Wellness', 'Pune', 'OPEN'
      ]
    );
    const gig3Id = gig3Res.rows[0].id;

    // ─── 7. Insert Applications ──────────────────────────────────────
    console.log('📝 Inserting applications...');

    const app1Res = await client.query(
      `INSERT INTO applications ("gigId", "influencerId", "coverNote", status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [
        gig1Id, influencer1Id,
        "Hey German Bakery! I love your pastries and have been a regular customer for years. I would love to feature your summer menu on my Instagram handle (45k followers, high engagement rate in Pune). Let's collaborate!",
        'PENDING'
      ]
    );
    const app1Id = app1Res.rows[0].id;

    const app2Res = await client.query(
      `INSERT INTO applications ("gigId", "influencerId", "coverNote", status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [
        gig3Id, influencer2Id,
        "UrbanFit looks amazing! As a fitness content creator with 72k followers, I would love to document a 30-day transformation at your studio. My audience in Pune would love this!",
        'ACCEPTED'
      ]
    );
    const app2Id = app2Res.rows[0].id;

    await client.query(
      `INSERT INTO applications ("gigId", "influencerId", "coverNote", status) 
       VALUES ($1, $2, $3, $4)`,
      [
        gig2Id, influencer3Id,
        "I'd love to feature German Bakery in my Pune food trail series! My fashion audience also loves food content — perfect cross-niche opportunity.",
        'PENDING'
      ]
    );

    // ─── 8. Insert Notifications ─────────────────────────────────────
    console.log('🔔 Inserting notifications...');

    await client.query(
      `INSERT INTO notifications ("userId", type, title, message, metadata, "isRead") 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        brandUser1Id,
        'APPLICATION_RECEIVED',
        'New application! 🎉',
        'Priya Sharma applied to your collab "Koregaon Park Cafe Review"',
        JSON.stringify({ gigId: gig1Id, applicationId: app1Id, influencerId: influencer1Id }),
        false
      ]
    );

    await client.query(
      `INSERT INTO notifications ("userId", type, title, message, metadata, "isRead") 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        influencer2UserId,
        'APPLICATION_ACCEPTED',
        "You're in! 🎊",
        'UrbanFit Studio accepted your application for "Fitness Transformation Challenge"',
        JSON.stringify({ gigId: gig3Id, applicationId: app2Id, brandId: brand2Id }),
        false
      ]
    );

    // ─── 9. Insert Messages ─────────────────────────────────────────
    console.log('💬 Inserting sample messages...');

    await client.query(
      `INSERT INTO messages ("senderId", "receiverId", "applicationId", content, "isRead") 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        brandUser2Id, influencer2UserId, app2Id,
        "Hey Arjun! Welcome aboard the Fitness Transformation Challenge! 🎉 Let's schedule your first visit to the studio this weekend. What time works for you?",
        false
      ]
    );

    await client.query(
      `INSERT INTO messages ("senderId", "receiverId", "applicationId", content, "isRead") 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        influencer2UserId, brandUser2Id, app2Id,
        "Thanks! Super excited about this collab! Saturday morning around 10 AM works great for me. Should I bring my own camera setup? 📷",
        false
      ]
    );

    // ─── 10. Insert Reviews ──────────────────────────────────────────
    console.log('⭐ Inserting sample reviews...');

    await client.query(
      `INSERT INTO reviews ("applicationId", "reviewerId", "revieweeId", rating, comment) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        app2Id, brandUser2Id, influencer2UserId,
        5, 'Arjun delivered amazing content! His fitness reels had engagement. Highly recommend!'
      ]
    );

    console.log('\n🎉 Database seeded successfully! Pune collabs are ready to roll! 🚀');
    console.log('\n📋 Seed Accounts (database records only — auth lives in Clerk):');
    console.log('   ┌──────────────────────────┬─────────────┐');
    console.log('   │ Email                    │ Role        │');
    console.log('   ├──────────────────────────┼─────────────┤');
    console.log('   │ cafe@youcollab.in        │ Brand       │');
    console.log('   │ urbanfit@youcollab.in    │ Brand       │');
    console.log('   │ priya@youcollab.in       │ Influencer  │');
    console.log('   │ arjun@youcollab.in       │ Influencer  │');
    console.log('   │ sneha@youcollab.in       │ Influencer  │');
    console.log('   └──────────────────────────┴─────────────┘');
    console.log('\n   Sign up through the app (Clerk) with any of these emails and');
    console.log('   the backend will automatically link the seeded profile.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
