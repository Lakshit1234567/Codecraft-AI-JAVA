package com.lakshit.projects.lovable_clone.entity;

import com.lakshit.projects.lovable_clone.enums.TestCaseStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "failed_test_cases", indexes = {
        @Index(name = "idx_failed_tc_project_id", columnList = "project_id"),
        @Index(name = "idx_failed_tc_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FailedTestCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    Project project;

    @Column(nullable = false, columnDefinition = "text")
    String input;

    @Column(nullable = false, columnDefinition = "text")
    String expectedOutput;

    @Column(nullable = false, columnDefinition = "text")
    String actualOutput;

    @Column(columnDefinition = "text")
    String explanation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    TestCaseStatus status = TestCaseStatus.FAILING;

    @CreationTimestamp
    Instant createdAt;

    @UpdateTimestamp
    Instant updatedAt;
}
