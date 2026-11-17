package com.lakshit.projects.lovable_clone.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lakshit.projects.lovable_clone.dto.auth.UserProfileResponse;
import com.lakshit.projects.lovable_clone.security.AuthUtil;
import com.lakshit.projects.lovable_clone.service.AuthService;
import com.lakshit.projects.lovable_clone.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @Mock
    private UserService userService;

    @Mock
    private AuthUtil authUtil;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
    }

    @Test
    void testGetProfile_Success() throws Exception {
        when(authUtil.getCurrentUserId()).thenReturn(42L);
        UserProfileResponse profile = new UserProfileResponse(42L, "johndoe", "John Doe");
        when(userService.getProfile(42L)).thenReturn(profile);

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42L))
                .andExpect(jsonPath("$.username").value("johndoe"))
                .andExpect(jsonPath("$.name").value("John Doe"));
    }
}
