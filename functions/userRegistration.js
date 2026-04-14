import { serve } from 'std/server';

serve(async (req) => {
    const { username, email, password } = await req.json();

    // Business validation: check if all fields are filled
    if (!username || !email || !password) {
        return new Response('All fields are required.', { status: 400 });
    }

    // Logic to create a new user in Supabase
    // Replace with actual Supabase code

    return new Response('User registered successfully.', { status: 201 });
});
