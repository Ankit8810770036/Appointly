import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Comprehensive list of ~70+ major and tier-2/3 Indian cities and towns across all zones
const CITIES_DATA = [
    // --- NORTH REGION ---
    { city: 'Delhi', state: 'Delhi', zip: '110001', lat: 28.6304, lng: 77.2177, areas: ['Connaught Place', 'Saket', 'Karol Bagh', 'Hauz Khas', 'Dwarka', 'Rohini', 'Lajpat Nagar', 'Vasant Kunj', 'Janakpuri', 'Pitampura'] },
    { city: 'Noida', state: 'Uttar Pradesh', zip: '201301', lat: 28.5700, lng: 77.3200, areas: ['Sector 18', 'Sector 62', 'Sector 137', 'Sector 50', 'Sector 76', 'Sector 15', 'Greater Noida West'] },
    { city: 'Gurgaon', state: 'Haryana', zip: '122002', lat: 28.4595, lng: 77.0266, areas: ['Cyber City', 'DLF Phase 1', 'Golf Course Road', 'Sohna Road', 'Sector 56', 'Sector 14', 'Palam Vihar'] },
    { city: 'Ghaziabad', state: 'Uttar Pradesh', zip: '201001', lat: 28.6692, lng: 77.4538, areas: ['Indirapuram', 'Vaishali', 'Raj Nagar Extension', 'Vasundhara', 'Crossings Republik'] },
    { city: 'Faridabad', state: 'Haryana', zip: '121001', lat: 28.4089, lng: 77.3178, areas: ['Sector 15', 'Sector 21C', 'NIT Faridabad', 'Greenfield', 'Neharpar'] },
    { city: 'Chandigarh', state: 'Chandigarh', zip: '160017', lat: 30.7333, lng: 76.7794, areas: ['Sector 17', 'Sector 35', 'Sector 22', 'Sector 8', 'Sector 43', 'Sector 11', 'Sector 26'] },
    { city: 'Mohali', state: 'Punjab', zip: '160055', lat: 30.7046, lng: 76.7179, areas: ['Phase 7', 'Phase 3B2', 'Phase 5', 'Sector 70', 'Aerocity'] },
    { city: 'Panchkula', state: 'Haryana', zip: '134109', lat: 30.6942, lng: 76.8606, areas: ['Sector 20', 'Sector 4', 'Sector 10', 'Sector 15', 'Mansa Devi Complex'] },
    { city: 'Jaipur', state: 'Rajasthan', zip: '302001', lat: 26.9124, lng: 75.7873, areas: ['Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 'C-Scheme', 'Raja Park', 'Jagatpura', 'Tonk Road'] },
    { city: 'Jodhpur', state: 'Rajasthan', zip: '342001', lat: 26.2389, lng: 73.0243, areas: ['Shastri Nagar', 'Ratanada', 'Sardarpura', 'Paota', 'Pal Road'] },
    { city: 'Udaipur', state: 'Rajasthan', zip: '313001', lat: 24.5854, lng: 73.7125, areas: ['Fatehpura', 'Hiran Magri', 'Panchwati', 'Saheli Nagar', 'Shobhagpura'] },
    { city: 'Kota', state: 'Rajasthan', zip: '324001', lat: 25.2138, lng: 75.8648, areas: ['Talwandi', 'Vigyan Nagar', 'Dadabari', 'Mahaveer Nagar', 'Indra Vihar'] },
    { city: 'Ajmer', state: 'Rajasthan', zip: '305001', lat: 26.4499, lng: 74.6399, areas: ['Civil Lines', 'Vaishali Nagar', 'Adarsh Nagar', 'Panchsheel Nagar'] },
    { city: 'Bikaner', state: 'Rajasthan', zip: '334001', lat: 28.0229, lng: 73.3119, areas: ['Kanta Khaturia Colony', 'Rani Bazar', 'Sadul Ganj', 'Pawan Puri'] },
    { city: 'Lucknow', state: 'Uttar Pradesh', zip: '226001', lat: 26.8467, lng: 80.9462, areas: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Mahanagar', 'Jankipuram', 'Ashiyana'] },
    { city: 'Kanpur', state: 'Uttar Pradesh', zip: '208001', lat: 26.4499, lng: 80.3319, areas: ['Swaroop Nagar', 'Kakadeo', 'Civil Lines', 'Kidwai Nagar', 'Govind Nagar', 'Sharda Nagar'] },
    { city: 'Varanasi', state: 'Uttar Pradesh', zip: '221001', lat: 25.3176, lng: 82.9739, areas: ['Lanka', 'Sigra', 'Mahmoorganj', 'Cantonment', 'Bhelupur', 'Rathyatra'] },
    { city: 'Agra', state: 'Uttar Pradesh', zip: '282001', lat: 27.1767, lng: 78.0081, areas: ['Sanjay Place', 'Tajganj', 'Dayalbagh', 'Kamla Nagar', 'Fatehabad Road'] },
    { city: 'Prayagraj', state: 'Uttar Pradesh', zip: '211001', lat: 25.4358, lng: 81.8463, areas: ['Civil Lines', 'George Town', 'Tagore Town', 'Katra', 'Ashok Nagar'] },
    { city: 'Meerut', state: 'Uttar Pradesh', zip: '250001', lat: 28.9845, lng: 77.7064, areas: ['Shastri Nagar', 'Modipuram', 'Ganga Nagar', 'Civil Lines', 'Saket'] },
    { city: 'Bareilly', state: 'Uttar Pradesh', zip: '243001', lat: 28.3670, lng: 79.4304, areas: ['Civil Lines', 'Rajendra Nagar', 'Janakpuri', 'DD Puram'] },
    { city: 'Gorakhpur', state: 'Uttar Pradesh', zip: '273001', lat: 26.7606, lng: 83.3732, areas: ['Golghar', 'Medical Road', 'Civil Lines', 'Taramandal', 'Shahpur'] },
    { city: 'Aligarh', state: 'Uttar Pradesh', zip: '202001', lat: 27.8974, lng: 78.0880, areas: ['Centre Point', 'Civil Lines', 'Marris Road', 'Dodhpur'] },
    { city: 'Dehradun', state: 'Uttarakhand', zip: '248001', lat: 30.3165, lng: 78.0322, areas: ['Rajpur Road', 'Jakhan', 'Dalanwala', 'Vasant Vihar', 'Ballupur', 'Clement Town'] },
    { city: 'Haridwar', state: 'Uttarakhand', zip: '249401', lat: 29.9457, lng: 78.1642, areas: ['Ranipur More', 'Jwalapur', 'Shivalik Nagar', 'Kankhal'] },
    { city: 'Shimla', state: 'Himachal Pradesh', zip: '171001', lat: 31.1048, lng: 77.1734, areas: ['The Mall', 'Sanjauli', 'Chotta Shimla', 'Kasumpti', 'New Shimla'] },
    { city: 'Amritsar', state: 'Punjab', zip: '143001', lat: 31.6340, lng: 74.8723, areas: ['Ranjit Avenue', 'Mall Road', 'Lawrence Road', 'Green Avenue', 'Majitha Road'] },
    { city: 'Ludhiana', state: 'Punjab', zip: '141001', lat: 30.9010, lng: 75.8573, areas: ['Sarabha Nagar', 'Model Town', 'BRS Nagar', 'Civil Lines', 'Ferozepur Road'] },
    { city: 'Jalandhar', state: 'Punjab', zip: '144001', lat: 31.3260, lng: 75.5762, areas: ['Model Town', 'Civil Lines', 'Urban Estate', 'Jalandhar Cantt', 'Rama Mandi'] },
    { city: 'Jammu', state: 'Jammu and Kashmir', zip: '180001', lat: 32.7266, lng: 74.8570, areas: ['Gandhi Nagar', 'Channi Himmat', 'Trikuta Nagar', 'Bahu Plaza', 'Talab Tillo'] },
    { city: 'Srinagar', state: 'Jammu and Kashmir', zip: '190001', lat: 34.0837, lng: 74.7973, areas: ['Lal Chowk', 'Rajbagh', 'Karan Nagar', 'Hyderpora', 'Sanat Nagar'] },

    // --- WEST REGION ---
    { city: 'Mumbai', state: 'Maharashtra', zip: '400001', lat: 19.0760, lng: 72.8777, areas: ['Bandra', 'Andheri', 'Colaba', 'Juhu', 'Powai', 'Dadar', 'Worli', 'Malad', 'Borivali', 'Goregaon'] },
    { city: 'Thane', state: 'Maharashtra', zip: '400601', lat: 19.2183, lng: 72.9781, areas: ['Ghodbunder Road', 'Panchpakhadi', 'Majiwada', 'Vartak Nagar', 'Hiranandani Estate'] },
    { city: 'Navi Mumbai', state: 'Maharashtra', zip: '400703', lat: 19.0330, lng: 73.0297, areas: ['Vashi', 'Nerul', 'Kharghar', 'Belapur', 'Seawoods', 'Kopar Khairane'] },
    { city: 'Pune', state: 'Maharashtra', zip: '411001', lat: 18.5204, lng: 73.8567, areas: ['Koregaon Park', 'Kothrud', 'Viman Nagar', 'Baner', 'Wakad', 'Hinjewadi', 'Aundh', 'Hadapsar', 'Kalyani Nagar'] },
    { city: 'Nagpur', state: 'Maharashtra', zip: '440001', lat: 21.1458, lng: 79.0882, areas: ['Dharampeth', 'Ramdaspeth', 'Pratap Nagar', 'Civil Lines', 'Manish Nagar', 'Sadar'] },
    { city: 'Nashik', state: 'Maharashtra', zip: '422001', lat: 19.9975, lng: 73.7898, areas: ['College Road', 'Gangapur Road', 'Indira Nagar', 'Panchavati', 'Mahatma Nagar'] },
    { city: 'Aurangabad', state: 'Maharashtra', zip: '431001', lat: 19.8762, lng: 75.3433, areas: ['CIDCO', 'Samarth Nagar', 'Garkheda', 'Seven Hills', 'Osmanpura'] },
    { city: 'Kolhapur', state: 'Maharashtra', zip: '416001', lat: 16.7050, lng: 74.2433, areas: ['Rajarampuri', 'Tarabai Park', 'Nagala Park', 'Shahupuri'] },
    { city: 'Solapur', state: 'Maharashtra', zip: '413001', lat: 17.6599, lng: 75.9064, areas: ['Saat Rasta', 'Jule Solapur', 'Hotgi Road', 'Budhwar Peth'] },
    { city: 'Ahmedabad', state: 'Gujarat', zip: '380001', lat: 23.0225, lng: 72.5714, areas: ['Navrangpura', 'Satellite', 'Bodakdev', 'Vastrapur', 'Prahlad Nagar', 'Thaltej', 'Maninagar', 'SG Highway'] },
    { city: 'Surat', state: 'Gujarat', zip: '395001', lat: 21.1702, lng: 72.8311, areas: ['Vesu', 'Adajan', 'Piplod', 'Ghod Dod Road', 'Varachha', 'Athwa', 'City Light'] },
    { city: 'Vadodara', state: 'Gujarat', zip: '390001', lat: 22.3072, lng: 73.1812, areas: ['Alkapuri', 'Gotri', 'Fatehgunj', 'Vasna Road', 'Manjalpur', 'Karelibaug'] },
    { city: 'Rajkot', state: 'Gujarat', zip: '360001', lat: 22.3039, lng: 70.8022, areas: ['Kalawad Road', 'Yagnik Road', 'University Road', 'Amin Marg', 'Nana Mava'] },
    { city: 'Gandhinagar', state: 'Gujarat', zip: '382010', lat: 23.2156, lng: 72.6369, areas: ['Sector 21', 'Sector 11', 'Sector 7', 'Infocity', 'Kudasan', 'Randesan'] },
    { city: 'Panaji', state: 'Goa', zip: '403001', lat: 15.4909, lng: 73.8278, areas: ['Miramar', 'Campal', 'Fontainhas', 'Caranzalem', 'Altinho'] },
    { city: 'Margao', state: 'Goa', zip: '403601', lat: 15.2832, lng: 73.9862, areas: ['Fatorda', 'Aquem', 'Borda', 'Comba', 'Pajifond'] },

    // --- SOUTH REGION ---
    { city: 'Bengaluru', state: 'Karnataka', zip: '560001', lat: 12.9716, lng: 77.5946, areas: ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar', 'JP Nagar', 'Electronic City', 'Hebbal', 'Malleshwaram', 'Marathahalli'] },
    { city: 'Mysuru', state: 'Karnataka', zip: '570001', lat: 12.2958, lng: 76.6394, areas: ['Gokulam', 'Jayalakshmipuram', 'Kuvempunagar', 'Saraswathipuram', 'Vijayanagar'] },
    { city: 'Mangaluru', state: 'Karnataka', zip: '575001', lat: 12.9141, lng: 74.8560, areas: ['Kadri', 'Bejai', 'Kodialbail', 'Lalbagh', 'Kankanady'] },
    { city: 'Hubli', state: 'Karnataka', zip: '580020', lat: 15.3647, lng: 75.1240, areas: ['Vidyanagar', 'Keshwapur', 'Gokul Road', 'Navanagar', 'Shirur Park'] },
    { city: 'Hyderabad', state: 'Telangana', zip: '500001', lat: 17.3850, lng: 78.4867, areas: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Madhapur', 'Kukatpally', 'Hitec City', 'Secunderabad', 'Begumpet', 'Kondapur'] },
    { city: 'Warangal', state: 'Telangana', zip: '506002', lat: 17.9689, lng: 79.5941, areas: ['Hanamkonda', 'Kazipet', 'Subedari', 'Nayeem Nagar'] },
    { city: 'Chennai', state: 'Tamil Nadu', zip: '600001', lat: 13.0827, lng: 80.2707, areas: ['T. Nagar', 'Adyar', 'Anna Nagar', 'Velachery', 'Mylapore', 'Alwarpet', 'Nungambakkam', 'OMR', 'Besant Nagar', 'Kilpauk'] },
    { city: 'Coimbatore', state: 'Tamil Nadu', zip: '641001', lat: 11.0168, lng: 76.9558, areas: ['RS Puram', 'Gandhipuram', 'Saibaba Colony', 'Peelamedu', 'Race Course'] },
    { city: 'Madurai', state: 'Tamil Nadu', zip: '625001', lat: 9.9252, lng: 78.1198, areas: ['KK Nagar', 'Anna Nagar', 'Tallakulam', 'SS Colony', 'TVS Nagar'] },
    { city: 'Tiruchirappalli', state: 'Tamil Nadu', zip: '620001', lat: 10.7905, lng: 78.7047, areas: ['Thillai Nagar', 'Cantonment', 'KK Nagar', 'Srirangam'] },
    { city: 'Salem', state: 'Tamil Nadu', zip: '636001', lat: 11.6643, lng: 78.1460, areas: ['Fairlands', 'Alagapuram', 'Hasthampatti', 'Suramangalam'] },
    { city: 'Kochi', state: 'Kerala', zip: '682001', lat: 9.9312, lng: 76.2673, areas: ['Kakkanad', 'Edappally', 'Panampilly Nagar', 'Fort Kochi', 'MG Road', 'Marine Drive', 'Palarivattom'] },
    { city: 'Thiruvananthapuram', state: 'Kerala', zip: '695001', lat: 8.5241, lng: 76.9366, areas: ['Kowdiar', 'Pattom', 'Vellayambalam', 'Technopark', 'Sasthamangalam', 'Kazhakoottam'] },
    { city: 'Kozhikode', state: 'Kerala', zip: '673001', lat: 11.2588, lng: 75.7804, areas: ['Mavoor Road', 'Nadakkavu', 'PT Usha Road', 'Chevayur'] },
    { city: 'Thrissur', state: 'Kerala', zip: '680001', lat: 10.5276, lng: 76.2144, areas: ['Swaraj Round', 'Ayyanthole', 'Patturaikkal', 'Ramavarmapuram'] },
    { city: 'Visakhapatnam', state: 'Andhra Pradesh', zip: '530001', lat: 17.6868, lng: 83.2185, areas: ['MVP Colony', 'Siripuram', 'Dwaraka Nagar', 'Gajuwaka', 'Madhurawada', 'Rushikonda'] },
    { city: 'Vijayawada', state: 'Andhra Pradesh', zip: '520001', lat: 16.5062, lng: 80.6480, areas: ['Benz Circle', 'MG Road', 'Governorpet', 'Moghalrajpuram', 'Gollapudi'] },
    { city: 'Guntur', state: 'Andhra Pradesh', zip: '522002', lat: 16.3067, lng: 80.4365, areas: ['Brodipet', 'Arundelpet', 'Laxmipuram', 'Pattabhipuram'] },
    { city: 'Tirupati', state: 'Andhra Pradesh', zip: '517501', lat: 13.6288, lng: 79.4192, areas: ['Bhavani Nagar', 'Korlagunta', 'AIR Bypass Road', 'Chandragiri'] },

    // --- EAST & NORTH-EAST REGION ---
    { city: 'Kolkata', state: 'West Bengal', zip: '700001', lat: 22.5726, lng: 88.3639, areas: ['Salt Lake', 'New Town', 'Park Street', 'Ballygunge', 'Alipore', 'Gariahat', 'Behala', 'Dum Dum', 'Rajarhat'] },
    { city: 'Howrah', state: 'West Bengal', zip: '711101', lat: 22.5958, lng: 88.2636, areas: ['Shibpur', 'Kadamtala', 'Santragachi', 'Bally', 'Liluah'] },
    { city: 'Siliguri', state: 'West Bengal', zip: '734001', lat: 26.7271, lng: 88.3953, areas: ['Sevoke Road', 'Hakim Para', 'Pradhan Nagar', 'Matigara', 'Punjabi Para'] },
    { city: 'Durgapur', state: 'West Bengal', zip: '713201', lat: 23.5204, lng: 87.3119, areas: ['City Centre', 'Benachity', 'Bidhannagar', 'Steel Township'] },
    { city: 'Asansol', state: 'West Bengal', zip: '713301', lat: 23.6739, lng: 86.9524, areas: ['Burnpur', 'Ushagram', 'Kalyanpur', 'Sen Raleigh Road'] },
    { city: 'Patna', state: 'Bihar', zip: '800001', lat: 25.5941, lng: 85.1376, areas: ['Kankarbagh', 'Boring Road', 'Bailey Road', 'Patliputra', 'Rajendra Nagar', 'Danapur', 'Fraser Road'] },
    { city: 'Gaya', state: 'Bihar', zip: '823001', lat: 24.7955, lng: 85.0002, areas: ['Civil Lines', 'AP Colony', 'Rampur', 'Bodhgaya Road'] },
    { city: 'Muzaffarpur', state: 'Bihar', zip: '842001', lat: 26.1209, lng: 85.3647, areas: ['Mithanpura', 'Kalambagh Road', 'Juran Chapra', 'Brahmpura'] },
    { city: 'Bhagalpur', state: 'Bihar', zip: '812001', lat: 25.2425, lng: 86.9842, areas: ['Adampur', 'Tilkamanjhi', 'Khanjarpur', 'Mirjanhat'] },
    { city: 'Ranchi', state: 'Jharkhand', zip: '834001', lat: 23.3441, lng: 85.3096, areas: ['Kanke Road', 'Harmu Housing Colony', 'Lalpur', 'Doranda', 'Bariatu', 'Morabadi', 'Hinoo'] },
    { city: 'Jamshedpur', state: 'Jharkhand', zip: '831001', lat: 22.8046, lng: 86.2029, areas: ['Bistupur', 'Sakchi', 'Kadma', 'Sonari', 'Telco', 'Baridih'] },
    { city: 'Dhanbad', state: 'Jharkhand', zip: '826001', lat: 23.7957, lng: 86.4304, areas: ['Saraidhela', 'Bank More', 'Hirapur', 'Steel Gate'] },
    { city: 'Bhubaneswar', state: 'Odisha', zip: '751001', lat: 20.2961, lng: 85.8245, areas: ['Saheed Nagar', 'Jayadev Vihar', 'Patia', 'Nayapalli', 'Chandrasekharpur', 'Khandagiri', 'Old Town'] },
    { city: 'Cuttack', state: 'Odisha', zip: '753001', lat: 20.4625, lng: 85.8828, areas: ['CDA Sector 6', 'Badambadi', 'Mangalabag', 'Chhatra Bazar', 'Buxi Bazar'] },
    { city: 'Rourkela', state: 'Odisha', zip: '769001', lat: 22.2604, lng: 84.8536, areas: ['Civil Township', 'Udit Nagar', 'Chhend Colony', 'Koel Nagar', 'Sector 4'] },
    { city: 'Guwahati', state: 'Assam', zip: '781001', lat: 26.1445, lng: 91.7362, areas: ['GS Road', 'Christian Basti', 'Dispur', 'Ganeshguri', 'Zoo Road', 'Ulubari', 'Beltola'] },
    { city: 'Shillong', state: 'Meghalaya', zip: '793001', lat: 25.5788, lng: 91.8933, areas: ['Police Bazar', 'Laitumkhrah', 'Labuan', 'Nongthymmai'] },
    { city: 'Agartala', state: 'Tripura', zip: '799001', lat: 23.8315, lng: 91.2868, areas: ['Banamalipur', 'Kunjaban', 'Radhanagar', 'Dhaleswar'] },

    // --- CENTRAL REGION ---
    { city: 'Bhopal', state: 'Madhya Pradesh', zip: '462001', lat: 23.2599, lng: 77.4126, areas: ['MP Nagar', 'Arera Colony', 'Kolar Road', 'Shahpura', 'Bittan Market', 'Hoshangabad Road'] },
    { city: 'Indore', state: 'Madhya Pradesh', zip: '452001', lat: 22.7196, lng: 75.8577, areas: ['Vijay Nagar', 'Palasia', 'Saket', 'Geeta Bhawan', 'Bhawarkua', 'AB Road', 'Rau'] },
    { city: 'Jabalpur', state: 'Madhya Pradesh', zip: '482001', lat: 23.1815, lng: 79.9864, areas: ['Wright Town', 'Napier Town', 'Gorakhpur', 'Civil Lines', 'Madan Mahal'] },
    { city: 'Gwalior', state: 'Madhya Pradesh', zip: '474001', lat: 26.2183, lng: 78.1828, areas: ['City Centre', 'Lashkar', 'Thatipur', 'Morar', 'Alkapuri'] },
    { city: 'Ujjain', state: 'Madhya Pradesh', zip: '456001', lat: 23.1765, lng: 75.7885, areas: ['Freeganj', 'Nanakheda', 'Rishi Nagar', 'Sethi Nagar'] },
    { city: 'Raipur', state: 'Chhattisgarh', zip: '492001', lat: 21.2514, lng: 81.6296, areas: ['Pandri', 'Shankar Nagar', 'Telibandha', 'Samta Colony', 'Devendra Nagar', 'VIP Road'] },
    { city: 'Bhilai', state: 'Chhattisgarh', zip: '490006', lat: 21.1938, lng: 81.3509, areas: ['Sector 6', 'Nehru Nagar', 'Smriti Nagar', 'Supela', 'Civic Centre'] }
];

// Rich Specialty Categories with corresponding realistic services
const SPECIALTY_PROFILES = [
    // --- HEALTH & WELLNESS ---
    {
        category: 'Health & wellness',
        specialty: 'Cardiologist & Heart Specialist',
        about: 'Board-certified cardiologist specializing in preventive heart health, cardiovascular wellness, and advanced ECG diagnostics.',
        services: [
            { name: 'Advanced Cardiac & ECG Consultation', duration: 45, price: 1200 },
            { name: 'Comprehensive Preventive Heart Checkup', duration: 60, price: 2500 },
            { name: 'Post-Recovery Cardiac Monitoring', duration: 30, price: 800 }
        ]
    },
    {
        category: 'Health & wellness',
        specialty: 'Dermatologist',
        about: 'Certified clinical dermatologist specializing in acne treatment, anti-aging therapies, and personalized skincare routines.',
        services: [
            { name: 'Clinical Skin Consultation & Acne Assessment', duration: 30, price: 800 },
            { name: 'Chemical Peel & Skin Brightening Therapy', duration: 45, price: 2200 },
            { name: 'Advanced Laser Scar & Pigmentation Removal', duration: 60, price: 3500 }
        ]
    },
    {
        category: 'Health & wellness',
        specialty: 'Physiotherapist',
        about: 'Specialist in musculoskeletal rehabilitation, sports injury recovery, and ergonomic spine alignment.',
        services: [
            { name: 'Orthopedic Back & Neck Pain Therapy', duration: 45, price: 650 },
            { name: 'Post-Surgery Joint Rehabilitation Session', duration: 60, price: 1100 },
            { name: 'Dry Needling & Deep Tissue Manual Therapy', duration: 45, price: 900 }
        ]
    },
    {
        category: 'Health & wellness',
        specialty: 'Nutritionist & Dietitian',
        about: 'Clinical nutritionist creating sustainable, science-backed dietary programs for fat loss, diabetes, and gut wellness.',
        services: [
            { name: 'Complete Body Composition Analysis & Diet Plan', duration: 45, price: 750 },
            { name: '1-Month Personalized Metabolic Nutrition Care', duration: 60, price: 2500 }
        ]
    },
    {
        category: 'Health & wellness',
        specialty: 'Psychologist & Counselor',
        about: 'Licensed cognitive therapist providing empathetic counseling for anxiety, workplace stress, and mindfulness.',
        services: [
            { name: 'Confidential Individual Counseling Session', duration: 50, price: 1200 },
            { name: 'Stress Management & Mindfulness Therapy', duration: 60, price: 1500 }
        ]
    },

    // --- BEAUTY & SPA ---
    {
        category: 'Beauty & spa',
        specialty: 'Hair Stylist & Salon Expert',
        about: 'Master hairstylist trained in modern precision cuts, balayage hair coloring, and keratin deep-repair treatments.',
        services: [
            { name: 'Signature Haircut, Wash & Blowdry Styling', duration: 45, price: 450 },
            { name: 'Organic Keratin Protein Infusion Spa', duration: 90, price: 2800 },
            { name: 'Custom Balayage & Global Hair Coloring', duration: 120, price: 3500 }
        ]
    },
    {
        category: 'Beauty & spa',
        specialty: 'Bridal & Party Makeup Artist',
        about: 'Celebrity makeup artist providing HD bridal looks, airbrush makeup, and pre-wedding beauty styling.',
        services: [
            { name: 'HD Party & Engagement Makeup Look', duration: 60, price: 2500 },
            { name: 'Luxury Royal HD Bridal Makeup Package', duration: 150, price: 8500 }
        ]
    },
    {
        category: 'Beauty & spa',
        specialty: 'Spa & Wellness Therapist',
        about: 'Certified therapist specializing in Swedish massage, deep tissue therapy, and detoxifying aromatherapy.',
        services: [
            { name: 'Aromatherapy Stress-Relief Full Body Massage', duration: 60, price: 1600 },
            { name: 'Deep Tissue Muscle Recovery Therapy', duration: 90, price: 2400 }
        ]
    },

    // --- HOME SERVICES ---
    {
        category: 'Home services',
        specialty: 'Licensed Electrician',
        about: 'Certified master electrician for home wiring, short circuit diagnosis, inverter setup, and smart lighting automation.',
        services: [
            { name: 'Electrical Appliance Inspection & Repair', duration: 45, price: 350 },
            { name: 'Smart Home Automation & Distribution Board Setup', duration: 90, price: 1400 }
        ]
    },
    {
        category: 'Home services',
        specialty: 'Expert Plumber',
        about: 'Prompt professional plumbing solutions for high-pressure leaks, bathroom sanitary fittings, and RO water purifiers.',
        services: [
            { name: 'Leakage Detection & Pipe Joint Repair', duration: 40, price: 300 },
            { name: 'Complete Bathroom Fittings & Sanitary Overhaul', duration: 90, price: 1200 }
        ]
    },
    {
        category: 'Home services',
        specialty: 'AC & Appliance Repair Tech',
        about: 'HVAC specialist for split/window AC jet servicing, compressor repairs, gas refilling, and refrigerator fixes.',
        services: [
            { name: 'Jet Foam Deep AC Servicing & Filter Cleaning', duration: 45, price: 550 },
            { name: 'AC Gas Top-Up & Comprehensive Diagnostics', duration: 60, price: 1600 }
        ]
    },
    {
        category: 'Home services',
        specialty: 'Deep Cleaning & Sanitization',
        about: 'Professional eco-friendly home sanitization, mechanized floor scrubbing, and sofa/mattress steam extraction.',
        services: [
            { name: 'Full 2BHK/3BHK Deep Home Cleaning', duration: 180, price: 2400 },
            { name: 'Intense Kitchen & Bathroom Stain Scrubbing', duration: 90, price: 1200 }
        ]
    },

    // --- FITNESS ---
    {
        category: 'Fitness',
        specialty: 'Yoga Instructor',
        about: 'Certified Hatha and Vinyasa yoga master helping clients achieve core stability, flexibility, and breathing control.',
        services: [
            { name: 'Private 1-on-1 Hatha Yoga & Pranayama Session', duration: 60, price: 600 },
            { name: 'Therapeutic Spine & Posture Correction Yoga', duration: 60, price: 800 }
        ]
    },
    {
        category: 'Fitness',
        specialty: 'Personal Fitness Trainer',
        about: 'ACE-certified strength and conditioning coach delivering customized HIIT, hypertrophy, and functional workouts.',
        services: [
            { name: 'Personal Strength Training & Form Correction', duration: 60, price: 700 },
            { name: 'High-Intensity Fat Burn & Core Conditioning', duration: 45, price: 550 }
        ]
    },

    // --- LEGAL & FINANCE ---
    {
        category: 'Legal & Finance',
        specialty: 'Corporate & Property Lawyer',
        about: 'Experienced advocate specializing in property deed verification, civil contracts, RERA disputes, and corporate compliance.',
        services: [
            { name: 'Property Title Search & Legal Verification', duration: 45, price: 1500 },
            { name: 'Commercial Agreement Drafting & Review', duration: 60, price: 2500 }
        ]
    },
    {
        category: 'Legal & Finance',
        specialty: 'Chartered Accountant & Tax Consultant',
        about: 'Fellow Chartered Accountant advising on Income Tax filing, GST compliance, startup registrations, and audit preparation.',
        services: [
            { name: 'Individual & Business Tax Advisory Consultation', duration: 45, price: 1000 },
            { name: 'Comprehensive GST Filing & Accounting Audit', duration: 60, price: 2000 }
        ]
    },

    // --- EDUCATION ---
    {
        category: 'Education',
        specialty: 'Mathematics & Science Specialist',
        about: 'Senior academic mentor delivering conceptual mastery, Olympiad problem solving, and CBSE/ICSE exam mastery.',
        services: [
            { name: 'Advanced Conceptual Problem-Solving Class', duration: 60, price: 600 },
            { name: 'Intensive Exam Preparation & Mock Test Analysis', duration: 90, price: 950 }
        ]
    },
    {
        category: 'Education',
        specialty: 'IELTS & Spoken English Coach',
        about: 'British Council certified trainer focusing on IELTS Band 8+ preparation, accent neutralization, and executive communication.',
        services: [
            { name: '1-on-1 IELTS Speaking Assessment & Feedback', duration: 45, price: 650 },
            { name: 'Executive Business Communication Coaching', duration: 60, price: 1100 }
        ]
    }
];

// Names for synthetic realism
const FIRST_NAMES = [
    'Aarav', 'Vihaan', 'Aditya', 'Reyansh', 'Muhammad', 'Sai', 'Arjun', 'Kabir', 'Rohan', 'Vivaan',
    'Ishaan', 'Shaurya', 'Aayush', 'Atharv', 'Dhruv', 'Kartik', 'Kunal', 'Manish', 'Nikhil', 'Pranav',
    'Rahul', 'Rishi', 'Samar', 'Siddharth', 'Varun', 'Yash', 'Ananya', 'Diya', 'Gauri', 'Isha',
    'Kavya', 'Khushi', 'Meera', 'Myra', 'Navya', 'Pooja', 'Priya', 'Rhea', 'Riya', 'Saanvi',
    'Shreya', 'Sneha', 'Tanvi', 'Vanya', 'Zoya', 'Aditi', 'Deepika', 'Divya', 'Harini', 'Ishita',
    'Kritika', 'Lavanya', 'Nandini', 'Neha', 'Payal', 'Radhika', 'Sakshi', 'Simran', 'Sunita', 'Tanya'
];

const LAST_NAMES = [
    'Sharma', 'Verma', 'Gupta', 'Malhotra', 'Mehta', 'Bhatia', 'Joshi', 'Chopra', 'Kapoor', 'Singh',
    'Patel', 'Shah', 'Desai', 'Kulkarni', 'Jadhav', 'Pawar', 'More', 'Shinde', 'Patil', 'Nair',
    'Menon', 'Pillai', 'Rao', 'Reddy', 'Chary', 'Varma', 'Iyer', 'Iyengar', 'Sundaram', 'Subramaniam',
    'Banerjee', 'Mukherjee', 'Chatterjee', 'Sen', 'Dutta', 'Ghosh', 'Mishra', 'Pandey', 'Tripathi', 'Tiwari',
    'Choudhary', 'Rathore', 'Shekhawat', 'Yadav', 'Kaur', 'Sandhu', 'Dhillon', 'Agrawal', 'Bansal', 'Goyal'
];

async function seed1000Providers() {
    console.log('🚀 Starting Large-Scale Provider Seeding (~1,000 Verified Specialists Across India)...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const TOTAL_TARGET = 1000;
    const providersPerCity = Math.ceil(TOTAL_TARGET / CITIES_DATA.length); // ~14-16 providers per city

    console.log(`📍 Distributing across ${CITIES_DATA.length} cities & towns (~${providersPerCity} per location)...`);

    let globalCount = 0;
    const batchSize = 50;
    let currentBatch = [];

    for (let cIdx = 0; cIdx < CITIES_DATA.length; cIdx++) {
        const cityInfo = CITIES_DATA[cIdx];

        for (let pIdx = 0; pIdx < providersPerCity; pIdx++) {
            if (globalCount >= TOTAL_TARGET) break;

            globalCount++;

            const fn = FIRST_NAMES[(globalCount * 7 + pIdx * 13) % FIRST_NAMES.length];
            const ln = LAST_NAMES[(globalCount * 11 + cIdx * 17) % LAST_NAMES.length];
            const isDoctor = (globalCount % 4 === 0);
            const fullName = `${isDoctor ? 'Dr. ' : ''}${fn} ${ln}`;
            const email = `provider.${globalCount}.${fn.toLowerCase()}.${ln.toLowerCase()}@appointly.in`;
            const phone = `+91 ${98000 + (globalCount % 1900)} ${10000 + (globalCount * 37 % 89999)}`;

            // Choose specialty profile deterministically
            const profile = SPECIALTY_PROFILES[(globalCount + pIdx) % SPECIALTY_PROFILES.length];

            // Specific area inside city
            const area = cityInfo.areas[pIdx % cityInfo.areas.length];
            const locationStr = `${area}, ${cityInfo.city}`;

            // Add slight micro-jitter to coordinates within ~1-4 km of neighborhood center
            const jitterLat = (Math.sin(globalCount * 12.9898) * 0.022);
            const jitterLng = (Math.cos(globalCount * 78.233) * 0.022);
            const lat = parseFloat((cityInfo.lat + jitterLat).toFixed(6));
            const lng = parseFloat((cityInfo.lng + jitterLng).toFixed(6));

            const rating = parseFloat((4.5 + ((globalCount * 3) % 6) * 0.1).toFixed(1)); // 4.5 to 5.0

            currentBatch.push({
                email,
                name: fullName,
                password: hashedPassword,
                role: 'PROVIDER',
                phone,
                location: locationStr,
                streetAddress: `Shop ${Math.floor(globalCount % 80 + 1)}, Main ${area} Commercial Road`,
                city: cityInfo.city,
                state: cityInfo.state,
                zipCode: cityInfo.zip,
                country: 'India',
                latitude: lat,
                longitude: lng,
                isEmailVerified: true,
                isPhoneVerified: true,
                providerProfile: {
                    create: {
                        specialty: profile.specialty,
                        about: `${profile.about} Serving clients in ${area} and neighboring localities with exceptional service.`,
                        rating,
                        phone,
                        location: locationStr,
                        isVerified: true,
                        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
                        availableSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
                        services: {
                            create: profile.services.map(s => ({
                                name: s.name,
                                duration: s.duration,
                                price: s.price
                            }))
                        }
                    }
                }
            });

            // Process batch
            if (currentBatch.length >= batchSize) {
                await Promise.all(
                    currentBatch.map(item =>
                        prisma.user.upsert({
                            where: { email: item.email },
                            update: {
                                name: item.name,
                                location: item.location,
                                streetAddress: item.streetAddress,
                                city: item.city,
                                state: item.state,
                                zipCode: item.zipCode,
                                latitude: item.latitude,
                                longitude: item.longitude,
                                providerProfile: {
                                    upsert: {
                                        create: {
                                            specialty: item.providerProfile.create.specialty,
                                            about: item.providerProfile.create.about,
                                            rating: item.providerProfile.create.rating,
                                            phone: item.providerProfile.create.phone,
                                            location: item.providerProfile.create.location,
                                            isVerified: true,
                                            workingDays: item.providerProfile.create.workingDays,
                                            availableSlots: item.providerProfile.create.availableSlots,
                                            services: item.providerProfile.create.services
                                        },
                                        update: {
                                            specialty: item.providerProfile.create.specialty,
                                            about: item.providerProfile.create.about,
                                            rating: item.providerProfile.create.rating,
                                            location: item.providerProfile.create.location,
                                            isVerified: true
                                        }
                                    }
                                }
                            },
                            create: item
                        })
                    )
                );
                console.log(`✨ Seeded ${globalCount} / ${TOTAL_TARGET} verified providers...`);
                currentBatch = [];
            }
        }
    }

    // Flush remaining
    if (currentBatch.length > 0) {
        await Promise.all(
            currentBatch.map(item =>
                prisma.user.upsert({
                    where: { email: item.email },
                    update: {},
                    create: item
                })
            )
        );
        console.log(`✨ Seeded all ${globalCount} / ${TOTAL_TARGET} providers!`);
    }

    // Final verification check
    const totalCount = await prisma.user.count({ where: { role: 'PROVIDER' } });
    const verifiedCount = await prisma.providerProfile.count({ where: { isVerified: true } });
    const totalServices = await prisma.service.count();

    console.log(`\n🎉 SEEDING COMPLETE SUMMARY:`);
    console.log(`- Total Providers in Database: ${totalCount}`);
    console.log(`- Verified Profiles: ${verifiedCount}`);
    console.log(`- Active Bookable Services: ${totalServices}`);
    console.log(`- Geographic Coverage: ${CITIES_DATA.length} Cities across India`);
    console.log(`- Default Login Password: "password123" for any provider account\n`);

    await prisma.$disconnect();
}

seed1000Providers().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
