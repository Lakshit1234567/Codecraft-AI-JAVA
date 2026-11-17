package com.lakshit.projects.lovable_clone.entity;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ToString
@EqualsAndHashCode
public class ChatSessionId implements Serializable {
    Long projectId;
    Long userId;
}
