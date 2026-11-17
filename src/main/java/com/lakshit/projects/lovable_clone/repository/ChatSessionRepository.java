package com.lakshit.projects.lovable_clone.repository;

import com.lakshit.projects.lovable_clone.entity.ChatSession;
import com.lakshit.projects.lovable_clone.entity.ChatSessionId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatSessionRepository extends JpaRepository<ChatSession, ChatSessionId> {
}
