-- ThreatZapper Fleet Manager Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Devices table: registered ThreatZapper appliances
create table devices (
  id uuid primary key default uuid_generate_v4(),
  device_id text unique not null,           -- MAC address (e.g., "AABBCCDDEEFF")
  name text,                                 -- Friendly name (e.g., "Office Router")
  wifi_ip text,
  mode text check (mode in ('bridge', 'router')),
  firmware text,
  uptime integer default 0,
  blocked_inbound bigint default 0,
  blocked_outbound bigint default 0,
  wifi_ssid text,
  wifi_signal integer,
  status text default 'online' check (status in ('online', 'offline', 'warning')),
  last_seen timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Block events: historical record for analytics
create table block_events (
  id uuid primary key default uuid_generate_v4(),
  device_id text references devices(device_id) on delete cascade,
  delta_inbound integer default 0,
  delta_outbound integer default 0,
  total_inbound bigint default 0,
  total_outbound bigint default 0,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_devices_device_id on devices(device_id);
create index idx_devices_last_seen on devices(last_seen);
create index idx_devices_status on devices(status);
create index idx_block_events_device_id on block_events(device_id);
create index idx_block_events_created_at on block_events(created_at);
create index idx_block_events_device_time on block_events(device_id, created_at desc);

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger devices_updated_at
  before update on devices
  for each row
  execute function update_updated_at();

-- Function to mark devices offline if no check-in for 5 minutes
create or replace function mark_offline_devices()
returns void as $$
begin
  update devices
  set status = 'offline'
  where last_seen < now() - interval '5 minutes'
    and status != 'offline';
end;
$$ language plpgsql;

-- View: recent block events with device info
create view recent_blocks as
select
  be.id,
  be.device_id,
  d.name as device_name,
  d.wifi_ip,
  be.delta_inbound,
  be.delta_outbound,
  be.created_at
from block_events be
join devices d on d.device_id = be.device_id
where be.created_at > now() - interval '24 hours'
order by be.created_at desc
limit 100;

-- View: device stats summary
create view device_stats as
select
  count(*) as total_devices,
  count(*) filter (where status = 'online') as online_devices,
  count(*) filter (where status = 'offline') as offline_devices,
  sum(blocked_inbound) as total_blocked_inbound,
  sum(blocked_outbound) as total_blocked_outbound
from devices;

-- View: hourly block aggregates (for charts)
create view hourly_blocks as
select
  date_trunc('hour', created_at) as hour,
  sum(delta_inbound) as inbound,
  sum(delta_outbound) as outbound
from block_events
where created_at > now() - interval '24 hours'
group by date_trunc('hour', created_at)
order by hour;

-- Row Level Security (optional - enable if needed)
-- alter table devices enable row level security;
-- alter table block_events enable row level security;

-- Cron job to mark offline devices (requires pg_cron extension)
-- Run every minute to check for offline devices
-- select cron.schedule('mark-offline', '* * * * *', 'select mark_offline_devices()');

-- Device commands: queued commands for devices to execute
-- Command types: update_blocklist, exec, reboot, update_firmware, set_config, file_download
create table device_commands (
  id uuid primary key default uuid_generate_v4(),
  device_id text references devices(device_id) on delete cascade,
  command_type text not null check (command_type in (
    'update_blocklist',   -- Download blocklist from URL
    'exec',               -- Execute shell script
    'reboot',             -- Reboot device
    'update_firmware',    -- Download and flash firmware
    'set_config',         -- Update UCI config
    'file_download'       -- Download file to specified path
  )),
  payload jsonb not null default '{}',  -- Command-specific data
  -- payload examples:
  -- update_blocklist: { "url": "https://..." }
  -- exec: { "script": "#!/bin/sh\n..." }
  -- reboot: {}
  -- update_firmware: { "url": "https://...", "sha256": "..." }
  -- set_config: { "key": "network.lan.ipaddr", "value": "192.168.1.1" }
  -- file_download: { "url": "https://...", "path": "/etc/threatzapper/custom.txt", "mode": "644" }
  status text default 'pending' check (status in ('pending', 'sent', 'acknowledged', 'completed', 'failed')),
  result text,                           -- Result/error message from device
  created_at timestamp with time zone default now(),
  sent_at timestamp with time zone,      -- When command was sent to device
  completed_at timestamp with time zone  -- When device reported completion
);

-- Index for fetching pending commands efficiently
create index idx_device_commands_pending on device_commands(device_id, status) where status = 'pending';
create index idx_device_commands_device on device_commands(device_id, created_at desc);

-- Broadcast commands: send to ALL devices (null device_id)
-- When device_id is null, command applies to all devices
alter table device_commands alter column device_id drop not null;

-- View: pending commands per device
create view pending_commands as
select
  dc.id,
  dc.device_id,
  dc.command_type,
  dc.payload,
  dc.created_at
from device_commands dc
where dc.status = 'pending'
order by dc.created_at asc;

-- Function to get pending commands for a device (includes broadcasts)
create or replace function get_pending_commands(p_device_id text)
returns table (
  id uuid,
  command_type text,
  payload jsonb
) as $$
begin
  return query
  select dc.id, dc.command_type, dc.payload
  from device_commands dc
  where (dc.device_id = p_device_id or dc.device_id is null)
    and dc.status = 'pending'
  order by dc.created_at asc
  limit 10;  -- Max 10 commands per check-in
end;
$$ language plpgsql;

-- Function to mark commands as sent
create or replace function mark_commands_sent(command_ids uuid[])
returns void as $$
begin
  update device_commands
  set status = 'sent', sent_at = now()
  where id = any(command_ids);
end;
$$ language plpgsql;

-- Sample data for testing (optional - comment out for production)
/*
insert into devices (device_id, name, wifi_ip, mode, firmware, blocked_inbound, blocked_outbound, wifi_ssid, wifi_signal)
values
  ('AABBCCDDEEFF', 'Office ThreatZapper', '192.168.1.100', 'bridge', '1.0.0', 1250, 340, 'OfficeWiFi', -45),
  ('112233445566', 'Home ThreatZapper', '192.168.6.93', 'bridge', '1.0.0', 890, 120, 'HomeNetwork', -52);

-- Sample command
insert into device_commands (device_id, command_type, payload)
values ('AABBCCDDEEFF', 'exec', '{"script": "echo hello > /tmp/test.txt"}');
*/
