package com.lakshit.projects.lovable_clone.mapper;

import com.lakshit.projects.lovable_clone.dto.dsa.TestCaseResponse;
import com.lakshit.projects.lovable_clone.entity.FailedTestCase;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DsaMapper {

    @Mapping(target = "projectId", source = "project.id")
    TestCaseResponse toTestCaseResponse(FailedTestCase failedTestCase);

    List<TestCaseResponse> toListOfTestCaseResponse(List<FailedTestCase> failedTestCases);
}
