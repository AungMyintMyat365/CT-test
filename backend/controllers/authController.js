import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { env } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';

const oauthClient = new OAuth2Client(env.googleClientId);

const loginSchema = z.object({
  credential: z.string().min(1),
});

const localAdminSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const localLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const buildAuthResponse = (user) => {
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    },
    env.appJwtSecret,
    { expiresIn: '12h' },
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
    },
  };
};

export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = loginSchema.parse(req.body);

    const ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ message: 'Invalid Google credential payload' });
    }

    const email = payload.email.toLowerCase();

    if (env.approvedCoachEmails.length > 0 && !env.approvedCoachEmails.includes(email)) {
      return res.status(403).json({ message: 'This account is not authorized' });
    }

    const { data: existingUser, error: getError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (getError) throw getError;

    const role =
      env.adminEmails.length === 0
        ? existingUser?.role || 'ADMIN'
        : env.adminEmails.includes(email)
          ? 'ADMIN'
          : 'COACH';

    const userPayload = {
      email,
      full_name: payload.name || email,
      role,
      is_active: true,
    };

    let user = existingUser;
    if (!existingUser) {
      const { data, error } = await supabase.from('users').insert(userPayload).select('*').single();
      if (error) throw error;
      user = data;
    } else {
      const { data, error } = await supabase
        .from('users')
        .update(userPayload)
        .eq('id', existingUser.id)
        .select('*')
        .single();
      if (error) throw error;
      user = data;
    }

    return res.status(200).json(buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
};

export const localAdminLogin = async (req, res, next) => {
  try {
    if (!env.adminLocalUsername || !env.adminLocalPasswordHash) {
      return res.status(503).json({ message: 'Local admin login is not configured' });
    }

    const { username, password } = localAdminSchema.parse(req.body);
    if (username !== env.adminLocalUsername) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, env.adminLocalPasswordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const localAdminEmail = `${env.adminLocalUsername.toLowerCase()}@local.ciy.club`;
    const { data: existingUser, error: getError } = await supabase
      .from('users')
      .select('*')
      .eq('email', localAdminEmail)
      .maybeSingle();
    if (getError) throw getError;

    const adminUserPayload = {
      email: localAdminEmail,
      full_name: env.adminLocalUsername,
      role: 'ADMIN',
      is_active: true,
    };

    let user = existingUser;
    if (!existingUser) {
      const { data, error } = await supabase
        .from('users')
        .insert(adminUserPayload)
        .select('*')
        .single();
      if (error) throw error;
      user = data;
    } else {
      const { data, error } = await supabase
        .from('users')
        .update(adminUserPayload)
        .eq('id', existingUser.id)
        .select('*')
        .single();
      if (error) throw error;
      user = data;
    }

    return res.status(200).json(buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
};

export const localLogin = async (req, res, next) => {
  try {
    const { username, password } = localLoginSchema.parse(req.body);

    const { data: localAccount, error: localError } = await supabase
      .from('local_accounts')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (localError) throw localError;
    if (!localAccount || !localAccount.is_active) {
      return res.status(401).json({ message: 'Invalid local credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, localAccount.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid local credentials' });
    }

    const localEmail = `${username.toLowerCase()}@local.ciy.club`;
    const { data: existingUser, error: getError } = await supabase
      .from('users')
      .select('*')
      .eq('email', localEmail)
      .maybeSingle();
    if (getError) throw getError;

    const userPayload = {
      email: localEmail,
      full_name: username,
      role: localAccount.role,
      is_active: true,
    };

    let user = existingUser;
    if (!existingUser) {
      const { data, error } = await supabase.from('users').insert(userPayload).select('*').single();
      if (error) throw error;
      user = data;
    } else {
      const { data, error } = await supabase
        .from('users')
        .update(userPayload)
        .eq('id', existingUser.id)
        .select('*')
        .single();
      if (error) throw error;
      user = data;
    }

    return res.status(200).json(buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
};

export const me = async (req, res) => {
  res.json({
    user: {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name,
    },
  });
};
