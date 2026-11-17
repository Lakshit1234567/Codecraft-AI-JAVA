package com.lakshit.projects.lovable_clone.controller;

import com.lakshit.projects.lovable_clone.dto.auth.AuthResponse;
import com.lakshit.projects.lovable_clone.dto.auth.LoginRequest;
import com.lakshit.projects.lovable_clone.dto.auth.SignupRequest;
import com.lakshit.projects.lovable_clone.dto.auth.UserProfileResponse;
import com.lakshit.projects.lovable_clone.security.AuthUtil;
import com.lakshit.projects.lovable_clone.service.AuthService;
import com.lakshit.projects.lovable_clone.service.UserService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class AuthController {

    AuthService authService;
    UserService userService;
    AuthUtil authUtil;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getProfile() {
        Long userId = authUtil.getCurrentUserId();
        return ResponseEntity.ok(userService.getProfile(userId));
    }

}
