local result = redis.call('SETNX', KEYS[1], ARGV[1])
if result == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
  return result