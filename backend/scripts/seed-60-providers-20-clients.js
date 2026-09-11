import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const CLIENTS = [
    { name: 'Rohit Sharma', email: 'rohit.sharma@client.com', phone: '+91 98200 11001', city: 'Mumbai', state: 'Maharashtra', zipCode: '400050', location: 'Bandra West, Mumbai', lat: 19.0600, lng: 72.8330 },
    { name: 'Sneha Desai', email: 'sneha.desai@client.com', phone: '+91 98200 11002', city: 'Mumbai', state: 'Maharashtra', zipCode: '400058', location: 'Andheri West, Mumbai', lat: 19.1363, lng: 72.8277 },
    { name: 'Aditya Roy', email: 'aditya.roy@client.com', phone: '+91 98200 11003', city: 'Mumbai', state: 'Maharashtra', zipCode: '400005', location: 'Colaba, Mumbai', lat: 18.9100, lng: 72.8180 },
    { name: 'Neha Kapoor', email: 'neha.kapoor@client.com', phone: '+91 98110 22001', city: 'Delhi', state: 'Delhi', zipCode: '110017', location: 'Saket, New Delhi', lat: 28.5245, lng: 77.2160 },
    { name: 'Gaurav Bhatia', email: 'gaurav.bhatia@client.com', phone: '+91 98110 22002', city: 'Delhi', state: 'Delhi', zipCode: '110005', location: 'Karol Bagh, New Delhi', lat: 28.6520, lng: 77.1910 },
    { name: 'Ananya Malik', email: 'ananya.malik@client.com', phone: '+91 98110 22003', city: 'Noida', state: 'Uttar Pradesh', zipCode: '201301', location: 'Sector 18, Noida', lat: 28.5710, lng: 77.3210 },
    { name: 'Kunal Verma', email: 'kunal.verma@client.com', phone: '+91 98110 22004', city: 'Gurgaon', state: 'Haryana', zipCode: '122002', location: 'Cyber City, Gurgaon', lat: 28.4960, lng: 77.0900 },
    { name: 'Deepak Nair', email: 'deepak.nair@client.com', phone: '+91 98450 33001', city: 'Bengaluru', state: 'Karnataka', zipCode: '560038', location: 'Indiranagar, Bengaluru', lat: 12.9780, lng: 77.6410 },
    { name: 'Pooja Reddy', email: 'pooja.reddy@client.com', phone: '+91 98450 33002', city: 'Bengaluru', state: 'Karnataka', zipCode: '560034', location: 'Koramangala, Bengaluru', lat: 12.9350, lng: 77.6250 },
    { name: 'Sanjay Kumar', email: 'sanjay.kumar@client.com', phone: '+91 98450 33003', city: 'Bengaluru', state: 'Karnataka', zipCode: '560066', location: 'Whitefield, Bengaluru', lat: 12.9700, lng: 77.7510 },
    { name: 'Manish Joshi', email: 'manish.joshi@client.com', phone: '+91 98220 44001', city: 'Pune', state: 'Maharashtra', zipCode: '411038', location: 'Kothrud, Pune', lat: 18.5080, lng: 73.8080 },
    { name: 'Tanvi Shinde', email: 'tanvi.shinde@client.com', phone: '+91 98220 44002', city: 'Pune', state: 'Maharashtra', zipCode: '411014', location: 'Viman Nagar, Pune', lat: 18.5685, lng: 73.9150 },
    { name: 'Suresh Babu', email: 'suresh.babu@client.com', phone: '+91 98490 55001', city: 'Hyderabad', state: 'Telangana', zipCode: '500034', location: 'Banjara Hills, Hyderabad', lat: 17.4160, lng: 78.4360 },
    { name: 'Aishwarya Rao', email: 'aishwarya.rao@client.com', phone: '+91 98490 55002', city: 'Hyderabad', state: 'Telangana', zipCode: '500081', location: 'Madhapur, Hyderabad', lat: 17.4490, lng: 78.3920 },
    { name: 'Karthik Rajan', email: 'karthik.rajan@client.com', phone: '+91 98400 66001', city: 'Chennai', state: 'Tamil Nadu', zipCode: '600017', location: 'T. Nagar, Chennai', lat: 13.0420, lng: 80.2350 },
    { name: 'Lakshmi Iyer', email: 'lakshmi.iyer@client.com', phone: '+91 98400 66002', city: 'Chennai', state: 'Tamil Nadu', zipCode: '600020', location: 'Adyar, Chennai', lat: 13.0020, lng: 80.2570 },
    { name: 'Debabrata Sen', email: 'debrata.sen@client.com', phone: '+91 98300 77001', city: 'Kolkata', state: 'West Bengal', zipCode: '700091', location: 'Salt Lake, Kolkata', lat: 22.5870, lng: 88.4180 },
    { name: 'Jigar Patel', email: 'jigar.patel@client.com', phone: '+91 98980 88001', city: 'Ahmedabad', state: 'Gujarat', zipCode: '380009', location: 'Navrangpura, Ahmedabad', lat: 23.0380, lng: 72.5530 },
    { name: 'Harsh Rathore', email: 'harsh.rathore@client.com', phone: '+91 98290 99001', city: 'Jaipur', state: 'Rajasthan', zipCode: '302017', location: 'Malviya Nagar, Jaipur', lat: 26.8530, lng: 75.8060 },
    { name: 'Vibha Shukla', email: 'vibha.shukla@client.com', phone: '+91 98390 10001', city: 'Lucknow', state: 'Uttar Pradesh', zipCode: '226010', location: 'Gomti Nagar, Lucknow', lat: 26.8510, lng: 80.9930 }
];

const PROVIDERS = [
    // === DELHI NCR (North) ===
    {
        name: 'Dr. Ananya Sen',
        email: 'ananya.sen@provider.com',
        phone: '+91 98111 00101',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110017',
        location: 'Saket, South Delhi',
        lat: 28.5244,
        lng: 77.2155,
        specialty: 'Dermatologist',
        rating: 4.9,
        about: 'Board-certified dermatologist specializing in clinical skincare, acne solutions, and laser treatments with 12+ years experience.',
        services: [
            { name: 'Skin & Acne Consultation', duration: 30, price: 800, category: 'Health & wellness' },
            { name: 'Advanced Skin Rejuvenation Therapy', duration: 60, price: 2500, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Rajesh Verma',
        email: 'rajesh.verma@provider.com',
        phone: '+91 98111 00102',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110005',
        location: 'Karol Bagh, Central Delhi',
        lat: 28.6514,
        lng: 77.1907,
        specialty: 'Electrician',
        rating: 4.8,
        about: 'Certified licensed electrical technician for home wiring, circuit upgrades, and smart home installations.',
        services: [
            { name: 'Electrical Inspection & Fix', duration: 45, price: 400, category: 'Home services' },
            { name: 'Complete Home Rewiring Assessment', duration: 90, price: 1500, category: 'Home services' }
        ]
    },
    {
        name: 'Priya Nair',
        email: 'priya.nair@provider.com',
        phone: '+91 98111 00103',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110016',
        location: 'Hauz Khas, Delhi',
        lat: 28.5494,
        lng: 77.2001,
        specialty: 'Yoga Instructor',
        rating: 5.0,
        about: 'Certified Ashtanga and Hatha yoga instructor helping clients improve posture, mindfulness, and flexibility.',
        services: [
            { name: 'Personal Yoga & Pranayama Session', duration: 60, price: 700, category: 'Fitness' },
            { name: 'Therapeutic Back Relief Yoga', duration: 45, price: 600, category: 'Fitness' }
        ]
    },
    {
        name: 'Manpreet Singh',
        email: 'manpreet.singh@provider.com',
        phone: '+91 98111 00104',
        city: 'Noida',
        state: 'Uttar Pradesh',
        zipCode: '201301',
        location: 'Sector 18, Noida',
        lat: 28.5700,
        lng: 77.3200,
        specialty: 'AC Repair Specialist',
        rating: 4.7,
        about: 'Quick diagnostic AC servicing, gas refilling, jet cleaning, and duct repair across Noida & East Delhi.',
        services: [
            { name: 'Split AC Deep Cleaning & Service', duration: 45, price: 599, category: 'Home services' },
            { name: 'Comprehensive AC Gas Leakage Fix', duration: 60, price: 1800, category: 'Home services' }
        ]
    },
    {
        name: 'Vikram Malhotra',
        email: 'vikram.malhotra@provider.com',
        phone: '+91 98111 00105',
        city: 'Gurgaon',
        state: 'Haryana',
        zipCode: '122002',
        location: 'Cyber City, Gurgaon',
        lat: 28.4950,
        lng: 77.0895,
        specialty: 'Corporate Lawyer',
        rating: 4.9,
        about: 'Experienced advocate specializing in company law, startup advisory, contracts, and IP protection.',
        services: [
            { name: 'Contract & Legal Advisory', duration: 45, price: 2000, category: 'Professional' },
            { name: 'Startup Incorporation Consultation', duration: 60, price: 3500, category: 'Professional' }
        ]
    },
    {
        name: 'Dr. Sameer Gupta',
        email: 'sameer.gupta@provider.com',
        phone: '+91 98111 00106',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110075',
        location: 'Dwarka, Delhi',
        lat: 28.5921,
        lng: 77.0460,
        specialty: 'Pediatrician',
        rating: 4.9,
        about: 'Gentle child specialist providing newborn care, developmental assessments, and immunization consultations.',
        services: [
            { name: 'Child Health Consultation', duration: 30, price: 750, category: 'Health & wellness' },
            { name: 'Growth & Developmental Evaluation', duration: 45, price: 1200, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Pooja Bhatia',
        email: 'pooja.bhatia@provider.com',
        phone: '+91 98111 00107',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110085',
        location: 'Rohini, Delhi',
        lat: 28.7159,
        lng: 77.1147,
        specialty: 'Bridal Makeup Artist',
        rating: 4.9,
        about: 'Celebrity bridal artist providing HD airbrush makeup, hairstyling, and pre-wedding styling packages.',
        services: [
            { name: 'Party Glam Makeup & Styling', duration: 60, price: 2500, category: 'Beauty & spa' },
            { name: 'Full HD Bridal Makeup Package', duration: 120, price: 12000, category: 'Beauty & spa' }
        ]
    },
    {
        name: 'Alok Mishra',
        email: 'alok.mishra@provider.com',
        phone: '+91 98111 00108',
        city: 'Noida',
        state: 'Uttar Pradesh',
        zipCode: '201309',
        location: 'Sector 62, Noida',
        lat: 28.6270,
        lng: 77.3650,
        specialty: 'Tax Consultant',
        rating: 4.8,
        about: 'Chartered tax consultant assisting individuals and businesses with ITR filing, GST compliance, and audit defense.',
        services: [
            { name: 'Individual ITR Consultation', duration: 30, price: 600, category: 'Professional' },
            { name: 'Corporate GST & Tax Audit Review', duration: 60, price: 2200, category: 'Professional' }
        ]
    },

    // === MUMBAI MMR (West) ===
    {
        name: 'Dr. Farhan Merchant',
        email: 'farhan.merchant@provider.com',
        phone: '+91 98200 00201',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400005',
        location: 'Colaba, Mumbai',
        lat: 18.9067,
        lng: 72.8147,
        specialty: 'Cardiologist',
        rating: 5.0,
        about: 'Senior consultant cardiologist specializing in preventative heart care, ECG analysis, and hypertension management.',
        services: [
            { name: 'Comprehensive Heart Checkup', duration: 40, price: 1500, category: 'Health & wellness' },
            { name: 'Cardiac Risk Assessment & Diet Plan', duration: 60, price: 2500, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Neha Kulkarni',
        email: 'neha.kulkarni@provider.com',
        phone: '+91 98200 00202',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400028',
        location: 'Dadar, Mumbai',
        lat: 19.0178,
        lng: 72.8478,
        specialty: 'Physiotherapist',
        rating: 4.9,
        about: 'Expert physiotherapist treating sports injuries, cervical spondylosis, and post-surgery rehabilitation.',
        services: [
            { name: 'Spine & Joint Mobilization', duration: 45, price: 700, category: 'Health & wellness' },
            { name: 'Post-Surgical Rehab Session', duration: 60, price: 1200, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Sagar Jadhav',
        email: 'sagar.jadhav@provider.com',
        phone: '+91 98200 00203',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400050',
        location: 'Bandra West, Mumbai',
        lat: 19.0596,
        lng: 72.8295,
        specialty: 'Plumber',
        rating: 4.7,
        about: 'Prompt emergency plumbing, pipeline unclogging, tap fixture, and pressure pump repairs in Bandra & Khar.',
        services: [
            { name: 'Leakage Repair & Drain Unclogging', duration: 45, price: 350, category: 'Home services' },
            { name: 'Bathroom Sanitary Fitting Installation', duration: 90, price: 1200, category: 'Home services' }
        ]
    },
    {
        name: 'Tanya Fernandes',
        email: 'tanya.fernandes@provider.com',
        phone: '+91 98200 00204',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400049',
        location: 'Juhu, Mumbai',
        lat: 19.1075,
        lng: 72.8263,
        specialty: 'Hair Stylist',
        rating: 4.9,
        about: 'International hair stylist specializing in balayage, precision cuts, keratin treatments, and hair spa.',
        services: [
            { name: 'Designer Hair Cut & Blowdry', duration: 45, price: 999, category: 'Beauty & spa' },
            { name: 'Keratin Smoothing & Hair Spa', duration: 90, price: 3500, category: 'Beauty & spa' }
        ]
    },
    {
        name: 'Rohan Deshmukh',
        email: 'rohan.deshmukh@provider.com',
        phone: '+91 98200 00205',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400069',
        location: 'Andheri East, Mumbai',
        lat: 19.1136,
        lng: 72.8697,
        specialty: 'Personal Fitness Trainer',
        rating: 4.8,
        about: 'Certified ACE fitness trainer offering functional training, fat loss coaching, and muscle building regimens.',
        services: [
            { name: 'Personal 1-on-1 Fitness Assessment', duration: 60, price: 650, category: 'Fitness' },
            { name: 'Strength & Conditioning Workout', duration: 60, price: 900, category: 'Fitness' }
        ]
    },
    {
        name: 'Sandeep Kamat',
        email: 'sandeep.kamat@provider.com',
        phone: '+91 98200 00206',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400021',
        location: 'Nariman Point, Mumbai',
        lat: 18.9256,
        lng: 72.8242,
        specialty: 'Chartered Accountant',
        rating: 4.9,
        about: 'Senior CA with 15 years experience in financial auditing, business taxation, and wealth planning.',
        services: [
            { name: 'Business Audit & Financial Strategy', duration: 45, price: 1800, category: 'Professional' },
            { name: 'Corporate Tax Structuring Advice', duration: 60, price: 3000, category: 'Professional' }
        ]
    },
    {
        name: 'Archana Patil',
        email: 'archana.patil@provider.com',
        phone: '+91 98200 00207',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        zipCode: '400703',
        location: 'Vashi, Navi Mumbai',
        lat: 19.0771,
        lng: 72.9986,
        specialty: 'Interior Designer',
        rating: 4.8,
        about: 'Residential and modular kitchen interior designer delivering aesthetic, space-saving urban home designs.',
        services: [
            { name: 'Home Layout & Decor Consultation', duration: 60, price: 1500, category: 'Professional' },
            { name: 'Full 3D Modular Interior Project Plan', duration: 120, price: 5000, category: 'Professional' }
        ]
    },
    {
        name: 'Ganesh Naik',
        email: 'ganesh.naik@provider.com',
        phone: '+91 98200 00208',
        city: 'Thane',
        state: 'Maharashtra',
        zipCode: '400601',
        location: 'Thane West, Thane',
        lat: 19.2183,
        lng: 72.9781,
        specialty: 'Appliance Repair',
        rating: 4.7,
        about: 'Expert servicing for washing machines, microwave ovens, refrigerators, and RO water purifiers.',
        services: [
            { name: 'Washing Machine Inspection & Repair', duration: 45, price: 450, category: 'Home services' },
            { name: 'Refrigerator Cooling Issue Diagnostic', duration: 45, price: 400, category: 'Home services' }
        ]
    },

    // === BENGALURU (South) ===
    {
        name: 'Dr. Arvind Swamy',
        email: 'arvind.swamy@provider.com',
        phone: '+91 98450 00301',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560038',
        location: 'Indiranagar, Bengaluru',
        lat: 12.9784,
        lng: 77.6408,
        specialty: 'Orthopedic Surgeon',
        rating: 5.0,
        about: 'Joint replacement specialist and sports medicine consultant with over 18 years of surgical expertise.',
        services: [
            { name: 'Joint Pain & Arthritis Consultation', duration: 30, price: 900, category: 'Health & wellness' },
            { name: 'Sports Injury & Ligament Assessment', duration: 45, price: 1500, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Kavya Venkatesh',
        email: 'kavya.venkatesh@provider.com',
        phone: '+91 98450 00302',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560034',
        location: 'Koramangala, Bengaluru',
        lat: 12.9352,
        lng: 77.6245,
        specialty: 'Pilates Instructor',
        rating: 4.9,
        about: 'Reformer and mat Pilates instructor focused on core strengthening, posture alignment, and flexibility.',
        services: [
            { name: 'Core & Posture Pilates Session', duration: 55, price: 850, category: 'Fitness' },
            { name: 'Private Mat Pilates Conditioning', duration: 60, price: 1200, category: 'Fitness' }
        ]
    },
    {
        name: 'Murugan Selvam',
        email: 'murugan.selvam@provider.com',
        phone: '+91 98450 00303',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560102',
        location: 'HSR Layout, Bengaluru',
        lat: 12.9121,
        lng: 77.6446,
        specialty: 'Carpenter',
        rating: 4.8,
        about: 'Skilled woodwork, modular wardrobe fittings, door repairs, and bespoke furniture craftsmanship.',
        services: [
            { name: 'Furniture Assembly & Repair', duration: 60, price: 450, category: 'Home services' },
            { name: 'Custom Wardrobe & Door Alignment', duration: 90, price: 1100, category: 'Home services' }
        ]
    },
    {
        name: 'Divya Hegde',
        email: 'divya.hegde@provider.com',
        phone: '+91 98450 00304',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560011',
        location: 'Jayanagar, Bengaluru',
        lat: 12.9308,
        lng: 77.5838,
        specialty: 'Dietitian & Nutritionist',
        rating: 4.9,
        about: 'Clinical nutritionist crafting sustainable lifestyle diets for diabetes management, PCOS, and healthy weight loss.',
        services: [
            { name: 'Personalized Nutrition & Diet Plan', duration: 45, price: 800, category: 'Health & wellness' },
            { name: 'Monthly Metabolic Health Coaching', duration: 60, price: 2000, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Pradeep Rao',
        email: 'pradeep.rao@provider.com',
        phone: '+91 98450 00305',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560066',
        location: 'Whitefield, Bengaluru',
        lat: 12.9698,
        lng: 77.7500,
        specialty: 'Web Developer Consultant',
        rating: 4.9,
        about: 'Full-stack cloud architect helping businesses build responsive web apps, REST APIs, and scalability pipelines.',
        services: [
            { name: 'Tech Architecture Review', duration: 45, price: 1800, category: 'Professional' },
            { name: 'Web App Performance & Security Audit', duration: 90, price: 3500, category: 'Professional' }
        ]
    },
    {
        name: 'Shreya Balan',
        email: 'shreya.balan@provider.com',
        phone: '+91 98450 00306',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560003',
        location: 'Malleshwaram, Bengaluru',
        lat: 13.0031,
        lng: 77.5643,
        specialty: 'Skincare Aesthetician',
        rating: 4.9,
        about: 'Holistic organic facial aesthetician providing hydra-facials, chemical peels, and glowing skincare rituals.',
        services: [
            { name: 'Hydra Glow Deep Cleanse Facial', duration: 60, price: 1400, category: 'Beauty & spa' },
            { name: 'Anti-Aging Collagen Facial', duration: 75, price: 2200, category: 'Beauty & spa' }
        ]
    },
    {
        name: 'Anand Kumar',
        email: 'anand.kumar@provider.com',
        phone: '+91 98450 00307',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560100',
        location: 'Electronic City, Bengaluru',
        lat: 12.8452,
        lng: 77.6602,
        specialty: 'Math & Science Tutor',
        rating: 4.9,
        about: 'IIT graduate offering interactive, conceptual coaching in Mathematics and Physics for grades 9-12.',
        services: [
            { name: '1-on-1 Math Problem Solving Session', duration: 60, price: 600, category: 'Education' },
            { name: 'Competitive Physics Foundation Class', duration: 90, price: 1000, category: 'Education' }
        ]
    },
    {
        name: 'Joseph Fernandez',
        email: 'joseph.fernandez@provider.com',
        phone: '+91 98450 00308',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560043',
        location: 'Kalyan Nagar, Bengaluru',
        lat: 13.0280,
        lng: 77.6392,
        specialty: 'Electrician',
        rating: 4.7,
        about: 'Expert emergency electrical service, inverter installation, and short-circuit troubleshooting.',
        services: [
            { name: 'Inverter & Battery Wiring', duration: 60, price: 500, category: 'Home services' },
            { name: 'Emergency Power Tripping Repair', duration: 45, price: 400, category: 'Home services' }
        ]
    },

    // === PUNE (West) ===
    {
        name: 'Dr. Snehal Joshi',
        email: 'snehal.joshi@provider.com',
        phone: '+91 98220 00401',
        city: 'Pune',
        state: 'Maharashtra',
        zipCode: '411038',
        location: 'Kothrud, Pune',
        lat: 18.5074,
        lng: 73.8077,
        specialty: 'General Physician',
        rating: 4.9,
        about: 'Family medicine physician handling viral fevers, chronic illnesses, blood pressure management, and wellness checks.',
        services: [
            { name: 'General Health Consultation', duration: 25, price: 500, category: 'Health & wellness' },
            { name: 'Comprehensive Annual Wellness Exam', duration: 45, price: 1100, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Amit Bapat',
        email: 'amit.bapat@provider.com',
        phone: '+91 98220 00402',
        city: 'Pune',
        state: 'Maharashtra',
        zipCode: '411014',
        location: 'Viman Nagar, Pune',
        lat: 18.5679,
        lng: 73.9143,
        specialty: 'Architect',
        rating: 4.9,
        about: 'Sustainable eco-architect specializing in villa planning, blueprint approvals, and contemporary aesthetics.',
        services: [
            { name: 'Architectural Design Consultation', duration: 60, price: 1800, category: 'Professional' },
            { name: 'Full Building Blueprint Review', duration: 120, price: 4500, category: 'Professional' }
        ]
    },
    {
        name: 'Radhika Shinde',
        email: 'radhika.shinde@provider.com',
        phone: '+91 98220 00403',
        city: 'Pune',
        state: 'Maharashtra',
        zipCode: '411001',
        location: 'Koregaon Park, Pune',
        lat: 18.5362,
        lng: 73.8930,
        specialty: 'Spa Therapist',
        rating: 5.0,
        about: 'Luxury holistic spa therapist certified in Swedish massage, deep tissue therapy, and aromatherapy.',
        services: [
            { name: 'Swedish Relaxation Massage', duration: 60, price: 1600, category: 'Beauty & spa' },
            { name: 'Deep Tissue Muscle Relief Therapy', duration: 90, price: 2400, category: 'Beauty & spa' }
        ]
    },
    {
        name: 'Sachin More',
        email: 'sachin.more@provider.com',
        phone: '+91 98220 00404',
        city: 'Pune',
        state: 'Maharashtra',
        zipCode: '411057',
        location: 'Hinjawadi, Pune',
        lat: 18.5913,
        lng: 73.7389,
        specialty: 'Pest Control Expert',
        rating: 4.8,
        about: 'Eco-friendly herbal pest control, anti-termite treatment, and cockroach eradication for flats and IT offices.',
        services: [
            { name: 'Herbal Cockroach & Pest Treatment', duration: 45, price: 699, category: 'Home services' },
            { name: 'Comprehensive Anti-Termite Treatment', duration: 120, price: 2800, category: 'Home services' }
        ]
    },
    {
        name: 'Meera Kadam',
        email: 'meera.kadam@provider.com',
        phone: '+91 98220 00405',
        city: 'Pune',
        state: 'Maharashtra',
        zipCode: '411007',
        location: 'Aundh, Pune',
        lat: 18.5580,
        lng: 73.8075,
        specialty: 'Vocal & Music Teacher',
        rating: 4.9,
        about: 'Hindustani classical vocalist and acoustic guitar tutor offering melodious lessons for all ages.',
        services: [
            { name: '1-on-1 Classical Vocal Coaching', duration: 45, price: 600, category: 'Education' },
            { name: 'Beginner Acoustic Guitar Lesson', duration: 60, price: 750, category: 'Education' }
        ]
    },
    {
        name: 'Nitin Pawar',
        email: 'nitin.pawar@provider.com',
        phone: '+91 98220 00406',
        city: 'Pune',
        state: 'Maharashtra',
        zipCode: '411028',
        location: 'Hadapsar, Pune',
        lat: 18.5089,
        lng: 73.9259,
        specialty: 'House Painter',
        rating: 4.7,
        about: 'Professional home painting, damp-proof water sealing, and texture wall design with premium Asian Paints.',
        services: [
            { name: 'Wall Painting & Color Consultation', duration: 60, price: 400, category: 'Home services' },
            { name: 'Waterproofing & Texture Wall Painting', duration: 90, price: 1500, category: 'Home services' }
        ]
    },

    // === HYDERABAD (South) ===
    {
        name: 'Dr. K. S. Reddy',
        email: 'ks.reddy@provider.com',
        phone: '+91 98490 00501',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500034',
        location: 'Banjara Hills, Hyderabad',
        lat: 17.4156,
        lng: 78.4350,
        specialty: 'ENT Specialist',
        rating: 4.9,
        about: 'Leading ENT surgeon diagnosing sinus, hearing loss, vertigo, and throat conditions with state-of-the-art endoscopy.',
        services: [
            { name: 'ENT Diagnostic Consultation', duration: 30, price: 700, category: 'Health & wellness' },
            { name: 'Video Endoscopic Sinus Evaluation', duration: 45, price: 1400, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Haritha Varma',
        email: 'haritha.varma@provider.com',
        phone: '+91 98490 00502',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500033',
        location: 'Jubilee Hills, Hyderabad',
        lat: 17.4319,
        lng: 78.4073,
        specialty: 'Makeup Artist',
        rating: 4.9,
        about: 'Bridal and editorial makeup artist specializing in traditional South Indian bridal transformations and saree draping.',
        services: [
            { name: 'Reception & Engagement Glam', duration: 60, price: 3000, category: 'Beauty & spa' },
            { name: 'Muhurtham Traditional Bridal Look', duration: 120, price: 9500, category: 'Beauty & spa' }
        ]
    },
    {
        name: 'Venkat Ramana',
        email: 'venkat.ramana@provider.com',
        phone: '+91 98490 00503',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500081',
        location: 'Hitec City, Hyderabad',
        lat: 17.4474,
        lng: 78.3762,
        specialty: 'AC Technician',
        rating: 4.8,
        about: 'Multi-brand inverter AC specialist handling PCB repairs, chemical washing, and emergency cooling fixes.',
        services: [
            { name: 'Inverter AC Chemical Wash', duration: 45, price: 650, category: 'Home services' },
            { name: 'PCB Circuit Diagnostic & Fix', duration: 60, price: 1400, category: 'Home services' }
        ]
    },
    {
        name: 'Madhavi Latha',
        email: 'madhavi.latha@provider.com',
        phone: '+91 98490 00504',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500032',
        location: 'Gachibowli, Hyderabad',
        lat: 17.4401,
        lng: 78.3489,
        specialty: 'Financial Planner',
        rating: 4.9,
        about: 'Certified Financial Planner (CFP) guiding tech professionals in retirement planning, mutual funds, and equity portfolios.',
        services: [
            { name: 'Comprehensive Wealth & Portfolio Review', duration: 60, price: 1500, category: 'Professional' },
            { name: 'Retirement & Goal-Based Financial Map', duration: 90, price: 3000, category: 'Professional' }
        ]
    },
    {
        name: 'Srinivas Chary',
        email: 'srinivas.chary@provider.com',
        phone: '+91 98490 00505',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500003',
        location: 'Secunderabad, Hyderabad',
        lat: 17.4399,
        lng: 78.4983,
        specialty: 'Plumber',
        rating: 4.7,
        about: 'Reliable sanitary fixtures, overhead tank cleaning, and leak repairs across Secunderabad & Hyderabad.',
        services: [
            { name: 'Overhead Tank Cleaning & Disinfection', duration: 60, price: 750, category: 'Home services' },
            { name: 'Pipeline Leak Detection & Sealing', duration: 45, price: 400, category: 'Home services' }
        ]
    },
    {
        name: 'Bhavna Rao',
        email: 'bhavna.rao@provider.com',
        phone: '+91 98490 00506',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500081',
        location: 'Madhapur, Hyderabad',
        lat: 17.4483,
        lng: 78.3915,
        specialty: 'Personal Fitness Trainer',
        rating: 4.9,
        about: 'Kettlebell, HIIT, and functional fitness trainer helping corporate employees maintain vitality and posture.',
        services: [
            { name: 'HIIT & Core Conditioning Session', duration: 50, price: 600, category: 'Fitness' },
            { name: 'Monthly Body Transformation Program', duration: 60, price: 1800, category: 'Fitness' }
        ]
    },

    // === CHENNAI (South) ===
    {
        name: 'Dr. S. Ramanathan',
        email: 's.ramanathan@provider.com',
        phone: '+91 98400 00601',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600017',
        location: 'T. Nagar, Chennai',
        lat: 13.0418,
        lng: 80.2341,
        specialty: 'Pediatrician',
        rating: 4.9,
        about: 'Distinguished pediatrician with over 20 years guiding parents through neonatal milestones and child wellness.',
        services: [
            { name: 'Child Consultation & Growth Review', duration: 30, price: 650, category: 'Health & wellness' },
            { name: 'Newborn Vaccine & Immunization Plan', duration: 45, price: 1100, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Preethi Sundaram',
        email: 'preethi.sundaram@provider.com',
        phone: '+91 98400 00602',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600020',
        location: 'Adyar, Chennai',
        lat: 13.0012,
        lng: 80.2565,
        specialty: 'Hair & Nail Artist',
        rating: 4.8,
        about: 'Modern salon artist providing gel extensions, French manicures, and botanical hair nourishment spas.',
        services: [
            { name: 'Luxury Gel Nails & Manicure', duration: 60, price: 1100, category: 'Beauty & spa' },
            { name: 'Ayurvedic Scalp & Hair Treatment', duration: 60, price: 1500, category: 'Beauty & spa' }
        ]
    },
    {
        name: 'Karthik Subramaniam',
        email: 'karthik.subramaniam@provider.com',
        phone: '+91 98400 00603',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600040',
        location: 'Anna Nagar, Chennai',
        lat: 13.0850,
        lng: 80.2101,
        specialty: 'Corporate Lawyer',
        rating: 4.9,
        about: 'High Court advocate practicing civil litigation, property registration, and commercial dispute resolution.',
        services: [
            { name: 'Property Verification & Title Search', duration: 60, price: 2000, category: 'Professional' },
            { name: 'Commercial Contract Drafting', duration: 90, price: 3500, category: 'Professional' }
        ]
    },
    {
        name: 'Muthu Vel',
        email: 'muthu.vel@provider.com',
        phone: '+91 98400 00604',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600042',
        location: 'Velachery, Chennai',
        lat: 12.9815,
        lng: 80.2180,
        specialty: 'Home Cleaner',
        rating: 4.7,
        about: 'Deep residential cleaning, kitchen degreasing, sofa sanitization, and bathroom scrub specialists.',
        services: [
            { name: 'Kitchen & Bathroom Deep Clean', duration: 90, price: 999, category: 'Home services' },
            { name: 'Full 2BHK Home Deep Sanitization', duration: 180, price: 2499, category: 'Home services' }
        ]
    },
    {
        name: 'Deepa Narayanan',
        email: 'deepa.narayanan@provider.com',
        phone: '+91 98400 00605',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600004',
        location: 'Mylapore, Chennai',
        lat: 13.0339,
        lng: 80.2677,
        specialty: 'Yoga & Meditation Coach',
        rating: 5.0,
        about: 'Traditional classical yoga teacher emphasizing breath control, stress relief, and mindful meditation.',
        services: [
            { name: 'Mindfulness & Stress Relief Yoga', duration: 60, price: 600, category: 'Fitness' },
            { name: 'Private Hatha Yoga Sadhana', duration: 60, price: 800, category: 'Fitness' }
        ]
    },

    // === KOLKATA (East) ===
    {
        name: 'Dr. Sourav Banerjee',
        email: 'sourav.banerjee@provider.com',
        phone: '+91 98300 00701',
        city: 'Kolkata',
        state: 'West Bengal',
        zipCode: '700016',
        location: 'Park Street, Kolkata',
        lat: 22.5516,
        lng: 88.3524,
        specialty: 'Psychiatrist',
        rating: 5.0,
        about: 'Empathetic mental health psychiatrist helping clients overcome anxiety, insomnia, depression, and burnout.',
        services: [
            { name: 'Mental Health Evaluation', duration: 45, price: 1200, category: 'Health & wellness' },
            { name: 'Cognitive Behavioral Therapy Session', duration: 60, price: 1800, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Ananya Mukherjee',
        email: 'ananya.mukherjee@provider.com',
        phone: '+91 98300 00702',
        city: 'Kolkata',
        state: 'West Bengal',
        zipCode: '700091',
        location: 'Salt Lake, Kolkata',
        lat: 22.5867,
        lng: 88.4178,
        specialty: 'Fitness Coach',
        rating: 4.9,
        about: 'Zumba and rhythm fitness coach blending Indian dance and aerobics for energetic calorie burn and endurance.',
        services: [
            { name: 'Aerobic Dance Fitness Session', duration: 55, price: 500, category: 'Fitness' },
            { name: 'Weight Loss Dance Bootcamp', duration: 60, price: 750, category: 'Fitness' }
        ]
    },
    {
        name: 'Subhash Ghosh',
        email: 'subhash.ghosh@provider.com',
        phone: '+91 98300 00703',
        city: 'Kolkata',
        state: 'West Bengal',
        zipCode: '700019',
        location: 'Ballygunge, Kolkata',
        lat: 22.5280,
        lng: 88.3656,
        specialty: 'Carpenter',
        rating: 4.8,
        about: 'Traditional Bengal wood craftsmanship, antique furniture restoration, polishing, and lock repairs.',
        services: [
            { name: 'Wood Furniture Polish & Touchup', duration: 60, price: 500, category: 'Home services' },
            { name: 'Antique Teak Wood Restoration', duration: 120, price: 1800, category: 'Home services' }
        ]
    },
    {
        name: 'Ruma Sen',
        email: 'ruma.sen@provider.com',
        phone: '+91 98300 00704',
        city: 'Kolkata',
        state: 'West Bengal',
        zipCode: '700156',
        location: 'New Town, Kolkata',
        lat: 22.5850,
        lng: 88.4627,
        specialty: 'Bridal Makeup Artist',
        rating: 4.9,
        about: 'Authentic Bengali bridal artist specializing in traditional Chandan art, bridal buns, and high-definition glam.',
        services: [
            { name: 'Traditional Bengali Bridal Makeup', duration: 120, price: 8000, category: 'Beauty & spa' },
            { name: 'Festive Saree Draping & Party Makeup', duration: 60, price: 2000, category: 'Beauty & spa' }
        ]
    },
    {
        name: 'Tapas Das',
        email: 'tapas.das@provider.com',
        phone: '+91 98300 00705',
        city: 'Howrah',
        state: 'West Bengal',
        zipCode: '711101',
        location: 'Howrah, Kolkata',
        lat: 22.5958,
        lng: 88.2636,
        specialty: 'Electrician',
        rating: 4.7,
        about: 'Prompt electrical troubleshooting, ceiling fan installation, fuse box upgrades, and home appliance wiring.',
        services: [
            { name: 'Ceiling Fan & Light Fixture Install', duration: 45, price: 300, category: 'Home services' },
            { name: 'Main Distribution Box Rewiring', duration: 60, price: 900, category: 'Home services' }
        ]
    },

    // === AHMEDABAD & GUJARAT (West) ===
    {
        name: 'Dr. Chirag Shah',
        email: 'chirag.shah@provider.com',
        phone: '+91 98980 00801',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380009',
        location: 'Navrangpura, Ahmedabad',
        lat: 23.0373,
        lng: 72.5525,
        specialty: 'Dentist',
        rating: 4.9,
        about: 'Modern cosmetic dental surgeon offering laser teeth whitening, ceramic crowns, and gentle painless fillings.',
        services: [
            { name: 'Dental Checkup & Ultrasonic Scaling', duration: 30, price: 600, category: 'Health & wellness' },
            { name: 'Laser Teeth Whitening Consultation', duration: 45, price: 2200, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Hetal Vora',
        email: 'hetal.vora@provider.com',
        phone: '+91 98980 00802',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380054',
        location: 'Bodakdev, Ahmedabad',
        lat: 23.0363,
        lng: 72.5147,
        specialty: 'Dietitian & Nutritionist',
        rating: 4.8,
        about: 'Nutritional wellness consultant focusing on vegetarian diets, cholesterol balancing, and thyroid health.',
        services: [
            { name: 'Vegetarian Lifestyle Diet Chart', duration: 40, price: 650, category: 'Health & wellness' },
            { name: 'Thyroid & Hormonal Diet Consultation', duration: 60, price: 1500, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Paresh Prajapati',
        email: 'paresh.prajapati@provider.com',
        phone: '+91 98980 00803',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380058',
        location: 'SG Highway, Ahmedabad',
        lat: 23.0525,
        lng: 72.5115,
        specialty: 'Plumber',
        rating: 4.7,
        about: 'Residential plumbing, motor pump repair, kitchen sink line clearing, and bathroom tap maintenance.',
        services: [
            { name: 'Kitchen Sink Unclogging & Trap Fix', duration: 45, price: 350, category: 'Home services' },
            { name: 'Water Booster Pump Installation', duration: 60, price: 950, category: 'Home services' }
        ]
    },
    {
        name: 'Bhavesh Patel',
        email: 'bhavesh.patel@provider.com',
        phone: '+91 98980 00804',
        city: 'Surat',
        state: 'Gujarat',
        zipCode: '395007',
        location: 'Vesu, Surat',
        lat: 21.1418,
        lng: 72.7709,
        specialty: 'Tax Advisor',
        rating: 4.9,
        about: 'Financial auditor assisting diamond and textile traders with GST compliance, cross-border tax, and filings.',
        services: [
            { name: 'Commercial Tax Assessment', duration: 45, price: 1200, category: 'Professional' },
            { name: 'Business Tax Saving Consultation', duration: 60, price: 2000, category: 'Professional' }
        ]
    },

    // === JAIPUR & RAJASTHAN (North/West) ===
    {
        name: 'Dr. Mahendra Choudhary',
        email: 'mahendra.choudhary@provider.com',
        phone: '+91 98290 00901',
        city: 'Jaipur',
        state: 'Rajasthan',
        zipCode: '302017',
        location: 'Malviya Nagar, Jaipur',
        lat: 26.8524,
        lng: 75.8054,
        specialty: 'Physiotherapist',
        rating: 4.9,
        about: 'Orthopedic physiotherapist helping elderly and sports enthusiasts with knee pain, sciatica, and posture correction.',
        services: [
            { name: 'Knee & Joint Physio Therapy', duration: 45, price: 550, category: 'Health & wellness' },
            { name: 'Sciatica & Low Back Recovery Care', duration: 60, price: 900, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Sunita Shekhawat',
        email: 'sunita.shekhawat@provider.com',
        phone: '+91 98290 00902',
        city: 'Jaipur',
        state: 'Rajasthan',
        zipCode: '302021',
        location: 'Vaishali Nagar, Jaipur',
        lat: 26.9068,
        lng: 75.7423,
        specialty: 'Skincare Aesthetician',
        rating: 4.8,
        about: 'Ayurvedic and herbal skincare expert delivering traditional bridal ubtans, organic facials, and waxing.',
        services: [
            { name: 'Royal Rajputana Herbal Facial', duration: 60, price: 1200, category: 'Beauty & spa' },
            { name: 'Full Body Ayurvedic Glow Polishing', duration: 90, price: 2500, category: 'Beauty & spa' }
        ]
    },
    {
        name: 'Ratan Lal',
        email: 'ratan.lal@provider.com',
        phone: '+91 98290 00903',
        city: 'Jaipur',
        state: 'Rajasthan',
        zipCode: '302001',
        location: 'C-Scheme, Jaipur',
        lat: 26.9100,
        lng: 75.7950,
        specialty: 'Electrician',
        rating: 4.7,
        about: 'Quick home electrical fixes, geyser installation, chandelier mounting, and switchboard replacement.',
        services: [
            { name: 'Water Geyser Repair & Fitting', duration: 45, price: 400, category: 'Home services' },
            { name: 'Switchboard & Heavy Line Replacement', duration: 60, price: 700, category: 'Home services' }
        ]
    },

    // === LUCKNOW & UTTAR PRADESH (North/Central) ===
    {
        name: 'Dr. Tariq Ansari',
        email: 'tariq.ansari@provider.com',
        phone: '+91 98390 01001',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        zipCode: '226010',
        location: 'Gomti Nagar, Lucknow',
        lat: 26.8500,
        lng: 80.9920,
        specialty: 'General Physician',
        rating: 4.9,
        about: 'Senior general physician offering thorough clinical consultations, blood work evaluations, and lifestyle counseling.',
        services: [
            { name: 'Routine Clinical Health Check', duration: 25, price: 450, category: 'Health & wellness' },
            { name: 'Diabetic & Hypertension Management Plan', duration: 45, price: 900, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Shalini Tripathi',
        email: 'shalini.tripathi@provider.com',
        phone: '+91 98390 01002',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        zipCode: '226001',
        location: 'Hazratganj, Lucknow',
        lat: 26.8467,
        lng: 80.9462,
        specialty: 'Career Counselor',
        rating: 5.0,
        about: 'Certified educational psychologist helping students select the right college streams, degrees, and career paths.',
        services: [
            { name: 'Student Aptitude & Stream Guidance', duration: 60, price: 900, category: 'Professional' },
            { name: 'Comprehensive Career Transition Plan', duration: 90, price: 1800, category: 'Professional' }
        ]
    },
    {
        name: 'Manoj Tiwari',
        email: 'manoj.tiwari@provider.com',
        phone: '+91 98390 01003',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        zipCode: '226024',
        location: 'Aliganj, Lucknow',
        lat: 26.8900,
        lng: 80.9400,
        specialty: 'AC Repair Specialist',
        rating: 4.8,
        about: 'Window and split AC technician providing seasonal overhaul, gas charging, and capacitor replacement.',
        services: [
            { name: 'Window / Split AC Servicing', duration: 40, price: 450, category: 'Home services' },
            { name: 'Cooling Coil Repair & Gas Refill', duration: 60, price: 1600, category: 'Home services' }
        ]
    },

    // === CHANDIGARH & PUNJAB (North) ===
    {
        name: 'Gurpreet Singh',
        email: 'gurpreet.singh@provider.com',
        phone: '+91 98720 01101',
        city: 'Chandigarh',
        state: 'Chandigarh',
        zipCode: '160035',
        location: 'Sector 35, Chandigarh',
        lat: 30.7230,
        lng: 76.7680,
        specialty: 'Personal Fitness Trainer',
        rating: 4.9,
        about: 'High-intensity strength trainer and weightlifting coach dedicated to transformative muscle tone and athletic conditioning.',
        services: [
            { name: 'Strength & Conditioning Coaching', duration: 60, price: 700, category: 'Fitness' },
            { name: 'Weightlifting & Posture Mastery', duration: 60, price: 900, category: 'Fitness' }
        ]
    },
    {
        name: 'Jasmeet Kaur',
        email: 'jasmeet.kaur@provider.com',
        phone: '+91 98720 01102',
        city: 'Amritsar',
        state: 'Punjab',
        zipCode: '143001',
        location: 'Mall Road, Amritsar',
        lat: 31.6340,
        lng: 74.8723,
        specialty: 'Spa Therapist',
        rating: 4.8,
        about: 'Holistic wellness therapist specializing in herbal body wraps, foot reflexology, and hot stone massage.',
        services: [
            { name: 'Herbal Foot Reflexology Spa', duration: 45, price: 800, category: 'Beauty & spa' },
            { name: 'Full Hot Stone Body Therapy', duration: 75, price: 2100, category: 'Beauty & spa' }
        ]
    },

    // === KOCHI, INDORE, BHOPAL, BHUBANESWAR (South/Central/East) ===
    {
        name: 'Dr. Thomas Mathew',
        email: 'thomas.mathew@provider.com',
        phone: '+91 98460 01201',
        city: 'Kochi',
        state: 'Kerala',
        zipCode: '682031',
        location: 'Marine Drive, Kochi',
        lat: 9.9816,
        lng: 76.2753,
        specialty: 'Dermatologist',
        rating: 4.9,
        about: 'Senior consultant dermatologist treating eczema, hair loss disorders, and pigmentation with modern therapies.',
        services: [
            { name: 'Scalp & Hair Loss Consultation', duration: 30, price: 700, category: 'Health & wellness' },
            { name: 'Medical Skin Therapy & Treatment', duration: 45, price: 1400, category: 'Health & wellness' }
        ]
    },
    {
        name: 'Varun Agrawal',
        email: 'varun.agrawal@provider.com',
        phone: '+91 98270 01202',
        city: 'Indore',
        state: 'Madhya Pradesh',
        zipCode: '452010',
        location: 'Vijay Nagar, Indore',
        lat: 22.7533,
        lng: 75.8937,
        specialty: 'Financial Advisor',
        rating: 4.8,
        about: 'Wealth advisor advising MSMEs and families on tax-efficient capital growth, mutual funds, and fixed income.',
        services: [
            { name: 'Investment Strategy Consultation', duration: 45, price: 800, category: 'Professional' },
            { name: 'Comprehensive Portfolio Rebalancing', duration: 60, price: 1600, category: 'Professional' }
        ]
    },
    {
        name: 'Rashmi Tiwari',
        email: 'rashmi.tiwari@provider.com',
        phone: '+91 98270 01203',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        zipCode: '462016',
        location: 'Arera Colony, Bhopal',
        lat: 23.2156,
        lng: 77.4363,
        specialty: 'Yoga Instructor',
        rating: 4.9,
        about: 'Patanjali trained yoga therapist specializing in prenatal yoga, hormonal balance, and meditative relaxation.',
        services: [
            { name: 'Gentle Prenatal & Wellness Yoga', duration: 60, price: 500, category: 'Fitness' },
            { name: 'Chakra Meditation & Breathwork', duration: 45, price: 600, category: 'Fitness' }
        ]
    },
    {
        name: 'Pradipta Mohanty',
        email: 'pradipta.mohanty@provider.com',
        phone: '+91 98610 01204',
        city: 'Bhubaneswar',
        state: 'Odisha',
        zipCode: '751007',
        location: 'Saheed Nagar, Bhubaneswar',
        lat: 20.2925,
        lng: 85.8450,
        specialty: 'Civil Engineer Consultant',
        rating: 4.8,
        about: 'Chartered structural civil engineer offering building stability checks, soil evaluation, and construction estimation.',
        services: [
            { name: 'Structural Safety & Site Inspection', duration: 60, price: 1500, category: 'Professional' },
            { name: 'Detailed Construction BOQ & Cost Estimate', duration: 90, price: 3200, category: 'Professional' }
        ]
    }
];

async function seed() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    console.log(`\n🌱 Starting seed: ${CLIENTS.length} Clients and ${PROVIDERS.length} Providers across India...`);

    // 1. Seed Clients
    let clientsCreated = 0;
    for (const c of CLIENTS) {
        await prisma.user.upsert({
            where: { email: c.email },
            update: {
                name: c.name,
                city: c.city,
                state: c.state,
                zipCode: c.zipCode,
                country: 'India',
                location: c.location,
                phone: c.phone,
                latitude: c.lat,
                longitude: c.lng
            },
            create: {
                name: c.name,
                email: c.email,
                password: hashedPassword,
                role: 'CLIENT',
                phone: c.phone,
                location: c.location,
                streetAddress: `House ${Math.floor(Math.random() * 90 + 10)}, ${c.location}`,
                city: c.city,
                state: c.state,
                zipCode: c.zipCode,
                country: 'India',
                latitude: c.lat,
                longitude: c.lng
            }
        });
        clientsCreated++;
    }
    console.log(`✅ ${clientsCreated} Clients seeded successfully.`);

    // 2. Seed Providers
    let providersCreated = 0;
    for (const p of PROVIDERS) {
        const user = await prisma.user.upsert({
            where: { email: p.email },
            update: {
                name: p.name,
                city: p.city,
                state: p.state,
                zipCode: p.zipCode,
                country: 'India',
                location: p.location,
                phone: p.phone,
                latitude: p.lat,
                longitude: p.lng
            },
            create: {
                name: p.name,
                email: p.email,
                password: hashedPassword,
                role: 'PROVIDER',
                phone: p.phone,
                location: p.location,
                streetAddress: `Suite ${Math.floor(Math.random() * 50 + 1)}, ${p.location}`,
                city: p.city,
                state: p.state,
                zipCode: p.zipCode,
                country: 'India',
                latitude: p.lat,
                longitude: p.lng
            }
        });

        const profile = await prisma.providerProfile.upsert({
            where: { userId: user.id },
            update: {
                specialty: p.specialty,
                about: p.about,
                location: p.location,
                phone: p.phone,
                rating: p.rating,
                isVerified: true
            },
            create: {
                userId: user.id,
                specialty: p.specialty,
                about: p.about,
                location: p.location,
                phone: p.phone,
                rating: p.rating,
                isVerified: true,
                workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
                availableSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00']
            }
        });

        for (const s of p.services) {
            const existing = await prisma.service.findFirst({
                where: {
                    providerProfileId: profile.id,
                    name: s.name
                }
            });

            if (existing) {
                await prisma.service.update({
                    where: { id: existing.id },
                    data: {
                        price: s.price,
                        duration: s.duration,
                        category: s.category || 'General'
                    }
                });
            } else {
                await prisma.service.create({
                    data: {
                        providerProfileId: profile.id,
                        name: s.name,
                        category: s.category || 'General',
                        duration: s.duration,
                        price: s.price
                    }
                });
            }
        }

        providersCreated++;
    }
    console.log(`✅ ${providersCreated} Providers with Profiles & Services seeded successfully.`);
    console.log(`\n🎉 Total: ${clientsCreated} Clients and ${providersCreated} Providers ready in database!`);
}

seed()
    .catch((err) => {
        console.error('❌ Error seeding data:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
