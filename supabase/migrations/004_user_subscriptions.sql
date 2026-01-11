-- Migration 004: Add subscription fields to customer_users
-- This migration adds subscription management fields for customer portal

-- Add subscription columns to customer_users table
alter table customer_users
  add column if not exists name text,
  add column if not exists subscription_status text default 'trial',
  add column if not exists subscription_plan text,
  add column if not exists trial_ends_at timestamp with time zone default (now() + interval '30 days'),
  add column if not exists subscription_expires_at timestamp with time zone,
  add column if not exists stripe_customer_id text,
  add column if not exists last_login timestamp with time zone;

-- Add constraints for valid subscription statuses
alter table customer_users
  add constraint if not exists valid_subscription_status
  check (subscription_status in ('trial', 'active', 'cancelled', 'expired', 'none'));

-- Add constraints for valid subscription plans
alter table customer_users
  add constraint if not exists valid_subscription_plan
  check (subscription_plan is null or subscription_plan in ('monthly'));

-- Create index on email for search/lookup
create index if not exists idx_customer_users_email on customer_users(email);

-- Create index on stripe_customer_id for webhook lookups
create index if not exists idx_customer_users_stripe on customer_users(stripe_customer_id);

-- Create index on subscription_status for filtering
create index if not exists idx_customer_users_status on customer_users(subscription_status);

-- Create view for user list with device count
create or replace view user_with_device_count as
select
  cu.id,
  cu.email,
  cu.name,
  cu.subscription_status,
  cu.subscription_plan,
  cu.trial_ends_at,
  cu.subscription_expires_at,
  cu.stripe_customer_id,
  cu.last_login,
  cu.created_at,
  count(d.device_id) as device_count
from customer_users cu
left join devices d on d.customer_user_id = cu.id
group by cu.id, cu.email, cu.name, cu.subscription_status, cu.subscription_plan,
         cu.trial_ends_at, cu.subscription_expires_at, cu.stripe_customer_id,
         cu.last_login, cu.created_at;

-- Add comments for documentation
comment on column customer_users.name is 'Customer display name';
comment on column customer_users.subscription_status is 'Current subscription state: trial, active, cancelled, expired, none';
comment on column customer_users.subscription_plan is 'Current plan: monthly or null';
comment on column customer_users.trial_ends_at is 'When 30-day trial ends (set on user creation)';
comment on column customer_users.subscription_expires_at is 'When paid subscription expires';
comment on column customer_users.stripe_customer_id is 'Stripe customer ID for payment processing';
comment on column customer_users.last_login is 'Last login timestamp for activity tracking';
comment on view user_with_device_count is 'Customer users with device count for admin dashboard';
