-- Migration 002: Add users table and device_metrics table
-- This migration adds user management and device metrics tracking

-- Create users table
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text,
  created_at timestamp with time zone default now()
);

-- Add new columns to devices table (safely handles existing devices)
alter table devices
  add column if not exists user_id uuid references users(id) on delete set null,
  add column if not exists first_seen timestamp with time zone default now(),
  add column if not exists last_reboot timestamp with time zone,
  add column if not exists mac_address text;

-- Set first_seen to created_at for existing devices
update devices
set first_seen = created_at
where first_seen is null;

-- Create device_metrics table
create table if not exists device_metrics (
  id uuid primary key default uuid_generate_v4(),
  device_id text references devices(device_id) on delete cascade,
  disk_total_mb integer,
  disk_used_mb integer,
  mem_total_mb integer,
  mem_used_mb integer,
  cpu_load real,
  temp_celsius real,
  created_at timestamp with time zone default now()
);

-- Create indexes
create index if not exists idx_users_email on users(email);
create index if not exists idx_devices_user on devices(user_id);
create index if not exists idx_metrics_device_time on device_metrics(device_id, created_at desc);

-- Add comments for documentation
comment on table users is 'Device owners and administrators';
comment on table device_metrics is 'Hardware metrics history for devices';
comment on column devices.user_id is 'Owner of this device';
comment on column devices.first_seen is 'When device was first registered';
comment on column devices.last_reboot is 'Last reboot timestamp reported by device';
comment on column devices.mac_address is 'Device MAC address (may duplicate device_id)';
