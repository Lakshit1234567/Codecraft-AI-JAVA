package com.lakshit.projects.lovable_clone.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lakshit.projects.lovable_clone.dto.member.InviteMemberRequest;
import com.lakshit.projects.lovable_clone.dto.member.MemberResponse;
import com.lakshit.projects.lovable_clone.dto.member.UpdateMemberRoleRequest;
import com.lakshit.projects.lovable_clone.enums.ProjectRole;
import com.lakshit.projects.lovable_clone.service.ProjectMemberService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ProjectMemberControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ProjectMemberService projectMemberService;

    @InjectMocks
    private ProjectMemberController projectMemberController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(projectMemberController).build();
    }

    @Test
    void testGetProjectMembers_Success() throws Exception {
        MemberResponse member = new MemberResponse(
                10L,
                "user@test.com",
                "Test User",
                ProjectRole.OWNER,
                Instant.now()
        );

        when(projectMemberService.getProjectMembers(1L)).thenReturn(List.of(member));

        mockMvc.perform(get("/api/projects/1/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].userId").value(10L))
                .andExpect(jsonPath("$[0].username").value("user@test.com"))
                .andExpect(jsonPath("$[0].role").value("OWNER"));
    }

    @Test
    void testInviteMember_Success() throws Exception {
        InviteMemberRequest request = new InviteMemberRequest("invitee@test.com", ProjectRole.EDITOR);
        MemberResponse response = new MemberResponse(
                20L,
                "invitee@test.com",
                "Invitee",
                ProjectRole.EDITOR,
                Instant.now()
        );

        when(projectMemberService.inviteMember(eq(1L), any(InviteMemberRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/projects/1/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value(20L))
                .andExpect(jsonPath("$.username").value("invitee@test.com"))
                .andExpect(jsonPath("$.role").value("EDITOR"));
    }

    @Test
    void testUpdateMemberRole_Success() throws Exception {
        UpdateMemberRoleRequest request = new UpdateMemberRoleRequest(ProjectRole.VIEWER);
        MemberResponse response = new MemberResponse(
                20L,
                "invitee@test.com",
                "Invitee",
                ProjectRole.VIEWER,
                Instant.now()
        );

        when(projectMemberService.updateMemberRole(eq(1L), eq(20L), any(UpdateMemberRoleRequest.class))).thenReturn(response);

        mockMvc.perform(patch("/api/projects/1/members/20")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(20L))
                .andExpect(jsonPath("$.role").value("VIEWER"));
    }

    @Test
    void testRemoveMember_Success() throws Exception {
        doNothing().when(projectMemberService).removeProjectMember(1L, 20L);

        mockMvc.perform(delete("/api/projects/1/members/20"))
                .andExpect(status().isNoContent());
    }
}
