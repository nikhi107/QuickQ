import redis
import os

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# Initialize Redis client
# Setting decode_responses=True ensures we get distinct strings instead of bytes
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

class QueueManager:
    @staticmethod
    def get_q_key(queue_id: str):
        return f"queue:{queue_id}"
        
    @staticmethod
    def join(queue_id: str, user_id: str, name: str):
        # Store user details in a hash
        redis_client.hset(f"user:{user_id}", mapping={"name": name, "queue_id": queue_id})
        # push to queue list
        redis_client.rpush(QueueManager.get_q_key(queue_id), user_id)
        # Position is current length
        return redis_client.llen(QueueManager.get_q_key(queue_id))

    @staticmethod
    def get_status(queue_id: str):
        key = QueueManager.get_q_key(queue_id)
        user_ids = redis_client.lrange(key, 0, -1)
        users = []
        for uid in user_ids:
            u_data = redis_client.hgetall(f"user:{uid}")
            if u_data:
                users.append({"user_id": uid, "name": u_data.get("name")})
            else:
                users.append({"user_id": uid, "name": "Unknown"})
        return users

    @staticmethod
    def call_next(queue_id: str):
        key = QueueManager.get_q_key(queue_id)
        next_user_id = redis_client.lpop(key)
        if next_user_id:
            u_data = redis_client.hgetall(f"user:{next_user_id}")
            return {"user_id": next_user_id, "name": u_data.get("name") if u_data else "Unknown"}
        return None

    @staticmethod
    def leave(queue_id: str, user_id: str):
        key = QueueManager.get_q_key(queue_id)
        removed = redis_client.lrem(key, 1, user_id)
        if removed:
            redis_client.delete(f"user:{user_id}")
            return True
        return False
        
    @staticmethod
    def get_position(queue_id: str, user_id: str):
        key = QueueManager.get_q_key(queue_id)
        try:
            # LPOS is available in Redis 6.0.6+
            pos = redis_client.execute_command('LPOS', key, user_id)
            if pos is not None:
                return int(pos) + 1 # 1-indexed position
        except Exception:
            # Fallback for older Redis versions
            items = redis_client.lrange(key, 0, -1)
            try:
                return items.index(user_id) + 1
            except ValueError:
                return None
        return None
