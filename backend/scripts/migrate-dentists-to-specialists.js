import prisma from '../src/prisma.js';
import { deleteCache } from '../src/utils/redis.js';

const NEW_SPECIALTIES = [
    {
        specialty: 'Senior Cardiologist',
        category: 'Health & wellness',
        about: 'Senior cardiologist specializing in cardiovascular wellness, non-invasive diagnostic ECG, and preventive heart care.',
        services: [
            { name: 'Advanced Cardiac & ECG Consultation', duration: 45, price: 1200 },
            { name: 'Comprehensive Preventive Heart Checkup', duration: 60, price: 2500 },
            { name: 'Post-Recovery Cardiac Monitoring', duration: 30, price: 800 }
        ]
    },
    {
        specialty: 'Neurologist & Spine Specialist',
        category: 'Health & wellness',
        about: 'Expert neurologist specializing in migraines, neuropathic conditions, and restorative spine rehabilitation.',
        services: [
            { name: 'Comprehensive Neurological Evaluation', duration: 45, price: 1500 },
            { name: 'Migraine & Chronic Headache Consultation', duration: 40, price: 1100 },
            { name: 'Spine Nerve Conduction Assessment', duration: 60, price: 2800 }
        ]
    },
    {
        specialty: 'Orthopedic & Joint Surgeon',
        category: 'Health & wellness',
        about: 'Board-certified orthopedic consultant specializing in arthritis, joint preservation, and sports injury rehabilitation.',
        services: [
            { name: 'Joint Mobility & Spine Assessment', duration: 30, price: 900 },
            { name: 'Sports Injury & Ligament Recovery Plan', duration: 45, price: 1400 },
            { name: 'Arthritis & Knee Pain Management Session', duration: 45, price: 1200 }
        ]
    },
    {
        specialty: 'Pediatric & Child Specialist',
        category: 'Health & wellness',
        about: 'Compassionate pediatrician focusing on newborn care, developmental milestones, vaccination, and adolescent wellness.',
        services: [
            { name: 'Infant & Child Wellness Checkup', duration: 30, price: 600 },
            { name: 'Child Nutrition & Growth Screening', duration: 45, price: 950 },
            { name: 'Adolescent Health & Immunity Advisory', duration: 40, price: 850 }
        ]
    },
    {
        specialty: 'General Physician & Internist',
        category: 'Health & wellness',
        about: 'Experienced internal medicine physician providing diagnostic consultations, lifestyle disease management, and preventive care.',
        services: [
            { name: 'Comprehensive Health & Preventive Checkup', duration: 30, price: 500 },
            { name: 'Diabetes & Hypertension Management Session', duration: 45, price: 850 },
            { name: 'Seasonal Viral Infection & Immunity Consultation', duration: 30, price: 600 }
        ]
    },
    {
        specialty: 'ENT & Sinus Specialist',
        category: 'Health & wellness',
        about: 'Otolaryngologist offering advanced solutions for sinusitis, allergic rhinitis, vertigo, and hearing health.',
        services: [
            { name: 'Sinus & Allergy Diagnostic Consultation', duration: 30, price: 700 },
            { name: 'Ear Micro-Suction & Hygiene Treatment', duration: 30, price: 900 },
            { name: 'Vertigo & Inner Ear Balance Evaluation', duration: 45, price: 1300 }
        ]
    },
    {
        specialty: 'Architectural & Interior Designer',
        category: 'Home services',
        about: 'Design architect specializing in modern residential layouts, spatial ergonomics, luxury interiors, and 3D visualization.',
        services: [
            { name: 'Residential Space Planning & 3D Concept', duration: 60, price: 2000 },
            { name: 'Turnkey Interior Renovation Consultation', duration: 90, price: 3500 },
            { name: 'Lighting & Acoustic Optimization Advisory', duration: 45, price: 1500 }
        ]
    },
    {
        specialty: 'AI & Cloud Solutions Consultant',
        category: 'Professional',
        about: 'Principal cloud architect advising enterprises and startups on generative AI adoption, scalability, and cloud architecture.',
        services: [
            { name: 'Enterprise Cloud Architecture Audit', duration: 60, price: 2500 },
            { name: 'AI Integration & Roadmap Consultation', duration: 60, price: 3000 },
            { name: 'Data Pipeline Scalability & Security Review', duration: 90, price: 4500 }
        ]
    },
    {
        specialty: 'Cybersecurity & Data Privacy Advisor',
        category: 'Professional',
        about: 'Certified information security specialist helping businesses secure digital assets, implement zero-trust, and satisfy audits.',
        services: [
            { name: 'Web & API Vulnerability Assessment', duration: 60, price: 2200 },
            { name: 'Data Protection & Compliance Strategy Session', duration: 60, price: 2600 },
            { name: 'Incident Response & Threat Mitigation Review', duration: 90, price: 4000 }
        ]
    },
    {
        specialty: 'Chartered Financial Planner',
        category: 'Legal & Finance',
        about: 'Fiduciary wealth advisor assisting families and executives in asset allocation, tax-efficient investment, and retirement planning.',
        services: [
            { name: 'Comprehensive Wealth & Retirement Blueprint', duration: 60, price: 1500 },
            { name: 'Investment Portfolio Risk & Performance Audit', duration: 45, price: 1200 },
            { name: 'Estate Planning & Family Trust Advisory', duration: 60, price: 2200 }
        ]
    },
    {
        specialty: 'Executive Mindset & Life Coach',
        category: 'Education',
        about: 'ICF-accredited executive coach empowering founders, professionals, and leaders to overcome burnout and achieve clarity.',
        services: [
            { name: 'Executive Leadership & Mindset Coaching', duration: 60, price: 1800 },
            { name: 'Career Transition & Strategic Clarity Session', duration: 50, price: 1400 },
            { name: 'High-Performance Focus & Stress Alignment', duration: 45, price: 1200 }
        ]
    },
    {
        specialty: 'Sports Nutrition & Metabolism Coach',
        category: 'Fitness',
        about: 'Performance sports dietitian working with athletes and fitness enthusiasts to optimize body composition and energy output.',
        services: [
            { name: 'Athletic Conditioning & Macro Diet Plan', duration: 45, price: 950 },
            { name: 'Metabolic Rate & Energy Optimization Session', duration: 60, price: 1600 },
            { name: 'Supplements & Performance Recovery Protocol', duration: 30, price: 750 }
        ]
    }
];

async function migrateDentists() {
    console.log('🔄 Starting migration of Dentist providers to diverse specialists...');

    const dentistProfiles = await prisma.providerProfile.findMany({
        where: {
            specialty: { contains: 'Dentist', mode: 'insensitive' }
        },
        include: {
            user: true,
            services: true,
            appointments: true
        }
    });

    console.log(`Found ${dentistProfiles.length} profiles to migrate.`);

    for (let i = 0; i < dentistProfiles.length; i++) {
        const profile = dentistProfiles[i];
        const targetSpec = NEW_SPECIALTIES[i % NEW_SPECIALTIES.length];

        // 1. Update Provider Profile specialty & bio
        await prisma.providerProfile.update({
            where: { id: profile.id },
            data: {
                specialty: targetSpec.specialty,
                about: targetSpec.about
            }
        });

        // 2. Update existing services or create new ones
        const existingServices = profile.services;
        for (let sIdx = 0; sIdx < targetSpec.services.length; sIdx++) {
            const specService = targetSpec.services[sIdx];
            if (sIdx < existingServices.length) {
                // Update existing service
                await prisma.service.update({
                    where: { id: existingServices[sIdx].id },
                    data: {
                        name: specService.name,
                        duration: specService.duration,
                        price: specService.price,
                        category: targetSpec.category
                    }
                });
            } else {
                // Create extra service if needed
                await prisma.service.create({
                    data: {
                        providerProfileId: profile.id,
                        name: specService.name,
                        duration: specService.duration,
                        price: specService.price,
                        category: targetSpec.category
                    }
                });
            }
        }

        // Delete any extra old services
        if (existingServices.length > targetSpec.services.length) {
            const surplusServices = existingServices.slice(targetSpec.services.length);
            for (const s of surplusServices) {
                // Check if appointment is linked to this service
                const linkedAppts = await prisma.appointment.count({ where: { serviceId: s.id } });
                if (linkedAppts === 0) {
                    await prisma.service.delete({ where: { id: s.id } });
                }
            }
        }

        console.log(`✅ [${i + 1}/${dentistProfiles.length}] ${profile.user.name} (${profile.user.email}) -> ${targetSpec.specialty}`);
    }

    // 3. Clear Redis cache for providers & stats
    try {
        await deleteCache('providers:*');
        await deleteCache('stats:*');
        console.log('⚡ Redis cache cleared.');
    } catch {
        // Cache clear optional if Redis offline
    }

    console.log('\n🎉 All Dentist providers have been successfully converted to diverse specialists!');
}

migrateDentists()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
