package com.lakshit.projects.lovable_clone.repository;

import com.lakshit.projects.lovable_clone.entity.FailedTestCase;
import com.lakshit.projects.lovable_clone.enums.TestCaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FailedTestCaseRepository extends JpaRepository<FailedTestCase, Long> {

    List<FailedTestCase> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    List<FailedTestCase> findByProjectIdAndStatusOrderByCreatedAtDesc(Long projectId, TestCaseStatus status);

    void deleteByProjectId(Long projectId);
}
