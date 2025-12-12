import os
import json
import time
import uuid
from typing import List, Dict, Optional
# 引入LangChain的标准消息对象，用于后续转换
from langchain_core.messages import messages_from_dict, messages_to_dict, HumanMessage, AIMessage

# 定义历史记录存储目录
HISTORY_DIR = "chat_history"
INDEX_FILE = os.path.join(HISTORY_DIR, "index.json")

# 初始化目录结构
if not os.path.exists(HISTORY_DIR):
    os.makedirs(HISTORY_DIR)
if not os.path.exists(INDEX_FILE):
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

class HistoryManager:
    """
    负责管理具体的会话消息以及全局的会话列表索引
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        # 每个会话对应一个独立的JSON文件
        self.file_path = os.path.join(HISTORY_DIR, f"{session_id}.json")


    # --- 核心功能 1: 读取消息 (带上下文截断) ---
    def load_messages(self, limit: int = 50):
        """
        加载当前会话的消息对象，供Agent思考使用。
        :param limit: 限制读取最近的N条消息 (Token 优化关键点)
        """
        if not os.path.exists(self.file_path):
            return []
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 将JSON字典转回LangChain的Message对象(HumanMessage, AIMessage等)
                all_messages = messages_from_dict(data)
                # 核心逻辑: 切片操作，只取最后 limit 条
                return all_messages[-limit:]
        except Exception as e:
            return [] 
        

    # --- 核心功能 2: 写入交互 ---
    def save_interaction(self, user_query: str, ai_response: str):
        """保存一轮新的对话(User+AI)，并更新索引"""
        # 1.读取旧数据
        current_data = []
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    current_data = json.load(f)
            except: pass
        
        # 2.构建新消息对
        new_messages = [
            HumanMessage(content=user_query),
            AIMessage(content=ai_response)
        ]

        # 3.追加并保存
        # messages_to_dict将对象序列化为JSON可存储的格式
        updated_data = current_data + messages_to_dict(new_messages)

        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, ensure_ascii=False, indent=2)
        
        # 4.更新全局索引(侧边栏列表)
        self._update_index(user_query)


    # --- 辅助功能: 会话列表索引管理 ---
    def _update_index(self, first_query: str):
        """更新index.json，如果会话不存在则创建，并自动生成标题"""
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            sessions = json.load(f)

        # 检查当前session_id是否已存在
        # 从 sessions 列表中找到第一个 id == self.session_id 的 session；如果没有找到，就返回 None
        session = next((s for s in sessions if s["id"] == self.session_id), None)
        current_timestamp = int(time.time())

        if session:
            # 老会话：只更新时间
            session["updated_at"] = current_timestamp
        else:
            # 新会话：生成标题（取前20个字）并添加
            title = first_query[:20] + "..." if len(first_query) > 20 else first_query
            new_session = {
                "id": self.session_id,
                "title": title,
                "created_at": current_timestamp,
                "updated_at": current_timestamp
            }
            sessions.append(new_session)

        # 保存索引
        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            json.dump(sessions, f, ensure_ascii=False, indent=2)

    
    @staticmethod
    def get_all_sessions() -> List[Dict]:
        """获取所有会话列表"""
        if not os.path.exists(INDEX_FILE):
            return []
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            sessions = json.load(f)
            # 按时间倒序排序，最近的在上面
            sessions.sort(key=lambda x: x.get("updated_at", 0), reversed=True)
            return sessions
        
    
    @staticmethod
    def delete_session(session_id: str):
        """删除会话文件及索引"""
        # 1.删文件
        file_path = os.path.join(HISTORY_DIR, f"{session_id}.json")
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # 2.删索引
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            sessions = json.load(f)
        sessions = [s for s in sessions if s["id"] != session_id]
        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            json.dump(sessions, f, ensure_ascii=False, indent=2)
    

    def get_full_history(self) -> List[Dict]:
        """获取全量历史"""
        if os.path.exists(self.file_path):
            with open(self.file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    
    