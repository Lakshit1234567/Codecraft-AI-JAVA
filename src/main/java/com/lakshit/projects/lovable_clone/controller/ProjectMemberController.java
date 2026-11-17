package com.lakshit.projects.lovable_clone.controller;

import com.lakshit.projects.lovable_clone.dto.member.InviteMemberRequest;
import com.lakshit.projects.lovable_clone.dto.member.MemberResponse;
import com.lakshit.projects.lovable_clone.dto.member.UpdateMemberRoleRequest;
import com.lakshit.projects.lovable_clone.service.ProjectMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
@RequiredArgsConstructor
public class ProjectMemberController {

    private final ProjectMemberService projectMemberService;

    @GetMapping
    @PreAuthorize("@security.canViewMembers(#projectId)")
    public ResponseEntity<List<MemberResponse>> getProjectMembers(@PathVariable("projectId") Long projectId) {
        return ResponseEntity.ok(projectMemberService.getProjectMembers(projectId));
    }

    @PostMapping
    @PreAuthorize("@security.canManageMembers(#projectId)")
    public ResponseEntity<MemberResponse> inviteMember(
            @PathVariable("projectId") Long projectId,
            @RequestBody @Valid InviteMemberRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                projectMemberService.inviteMember(projectId, request)
        );
    }

    @PatchMapping("/{memberId}")
    @PreAuthorize("@security.canManageMembers(#projectId)")
    public ResponseEntity<MemberResponse> updateMemberRole(
            @PathVariable("projectId") Long projectId,
            @PathVariable("memberId") Long memberId,
            @RequestBody @Valid UpdateMemberRoleRequest request
    ) {
        return ResponseEntity.ok(projectMemberService.updateMemberRole(projectId, memberId, request));
    }

    @DeleteMapping("/{memberId}")
    @PreAuthorize("@security.canManageMembers(#projectId)")
    public ResponseEntity<Void> removeMember(
            @PathVariable("projectId") Long projectId,
            @PathVariable("memberId") Long memberId
    ) {
        projectMemberService.removeProjectMember(projectId, memberId);
        return ResponseEntity.noContent().build();
    }

}
