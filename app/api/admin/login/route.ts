/**
 * Admin Login Endpoint
 * 
 * Simple password-based authentication for admin dashboard.
 * Sets a cookie to maintain session.
 * 
 * @route POST /api/admin/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_PASSWORD } from '@/lib/constants';
import { logSystemEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'forecaster_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;
    
    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }
    
    if (password !== ADMIN_PASSWORD) {
      logSystemEvent('admin_login_failed', {
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      }, 'warning');
      
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    // Generate a simple session token
    const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
    
    logSystemEvent('admin_login_success', {
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    const response = NextResponse.json({ success: true });
    
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Logout
  const response = NextResponse.json({ success: true });
  
  response.cookies.delete(COOKIE_NAME);
  
  return response;
}



