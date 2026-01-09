-- Migration: Add device_commands table for C2 functionality
-- Run this on existing databases

-- Device commands: queued commands for devices to execute
create table if not exists device_commands (
  id uuid primary key default uuid_generate_v4(),
  device_id text references devices(device_id) on delete cascade,
  command_type text not null check (command_type in (
    'update_blocklist',
    'exec',
    'reboot',
    'update_firmware',
    'set_config',
    'file_download'
  )),
  payload jsonb not null default '{}',
  status text default 'pending' check (status in ('pending', 'sent', 'acknowledged', 'completed', 'failed')),
  result text,
  created_at timestamp with time zone default now(),
  sent_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- Indexes
create index if not exists idx_device_commands_pending on device_commands(device_id, status) where status = 'pending';
create index if not exists idx_device_commands_device on device_commands(device_id, created_at desc);

-- Allow broadcast commands (null device_id)
alter table device_commands alter column device_id drop not null;

-- Function to get pending commands for a device
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
  limit 10;
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
