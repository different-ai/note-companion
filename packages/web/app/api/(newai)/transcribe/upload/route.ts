import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData(); // ⬅️ parse the form data
        const file = formData.get('file') as File; // ⬅️ get the uploaded file

        // Add this check after getting the file from formData
        if (!file || file.size === 0) {
            return NextResponse.json({ error: 'File is missing or empty' }, { status: 400 });
        }

        // Use the put function to upload to blob storage
        const { url } = await put(file.name, file, {
            access: 'public',
        });

        return NextResponse.json({ url }, { status: 201 });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
