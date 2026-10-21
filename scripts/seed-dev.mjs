// Explicitly localhost-only; does not create real candidates or send email.
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||process.env.ALLOW_DEV_SEED!=='1')throw new Error('Only a local Supabase instance with ALLOW_DEV_SEED=1 may be seeded.');
if(!process.env.SUPABASE_SECRET_KEY)throw new Error('SUPABASE_SECRET_KEY is required for the local development instance.');
const client=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const {data:users,error:usersError}=await client.auth.admin.listUsers();if(usersError)throw usersError;
const email='fictional-demo@example.invalid';let user=users.users.find(u=>u.email===email);
if(!user){const {data,error}=await client.auth.admin.createUser({email,email_confirm:true});if(error)throw error;user=data.user;}
const common={owner_id:user.id,function:'Engineering',seniority:'Senior',location:'Warsaw, Poland',regions:['Europe'],work_modes:['Remote'],skills:['TypeScript','React','PostgreSQL'],note:'Fictional development data. Not a real person or opportunity.',status:'active'};
const profile=await client.from('candidate_profiles').upsert({...common,slug:'fictional-demo-person',full_name:'Fictional Demo Person',target_role:'Senior Software Engineer',linkedin_url:'https://www.linkedin.com/',relocation:false},{onConflict:'owner_id'});
if(profile.error)throw profile.error;
const role=await client.from('hiring_roles').upsert({...common,slug:'fictional-demo-role',company_name:'Fictional Demo Team',contact_name:'Fictional Demo Contact',role_title:'Senior Software Engineer',vacancy_url:'https://example.com/',contact_linkedin_url:'https://www.linkedin.com/'},{onConflict:'slug'});
if(role.error)throw role.error;
console.log('Local fictional profile and role are available. No email was sent.');
