package com.jptaxi.application.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jptaxi.application.dto.CreateUserRequest;
import com.jptaxi.application.dto.ForgotPasswordRequest;
import com.jptaxi.application.dto.ForgotPasswordResponse;
import com.jptaxi.application.dto.LoginRequest;
import com.jptaxi.application.dto.ResetPasswordRequest;
import com.jptaxi.application.dto.UpdateUserRequest;
import com.jptaxi.application.dto.UserDto;
import com.jptaxi.application.entity.User;
import com.jptaxi.application.entity.UserRole;
import com.jptaxi.application.repository.UserRepository;
import com.jptaxi.application.service.DtoMapper;
import com.jptaxi.application.service.PasswordResetEmailService;
import com.jptaxi.application.service.PasswordResetTokenService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();
    private static final String LEGACY_DEMO_PASSWORD_HASH =
            "$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta";
    private static final String PASSWORD_RESET_SENT_MESSAGE =
            "If this email exists, password reset instructions have been sent.";

    private final UserRepository userRepository;
    private final DtoMapper mapper;
    private final PasswordResetTokenService passwordResetTokenService;
    private final PasswordResetEmailService passwordResetEmailService;
    private final String resetPasswordUrl;

    public UserController(
            UserRepository userRepository,
            DtoMapper mapper,
            PasswordResetTokenService passwordResetTokenService,
            PasswordResetEmailService passwordResetEmailService,
            @Value("${app.frontend.reset-password-url:http://localhost:5173/reset-password}") String resetPasswordUrl
    ) {
        this.userRepository = userRepository;
        this.mapper = mapper;
        this.passwordResetTokenService = passwordResetTokenService;
        this.passwordResetEmailService = passwordResetEmailService;
        this.resetPasswordUrl = resetPasswordUrl;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<UserDto> getUsers() {
        return userRepository.findAll().stream().map(mapper::toUserDto).toList();
    }

    @GetMapping("/by-email")
    @Transactional(readOnly = true)
    public ResponseEntity<UserDto> getByEmail(@RequestParam String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(mapper::toUserDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/login")
    @Transactional(readOnly = true)
    public ResponseEntity<UserDto> login(@RequestBody LoginRequest request) {
        if (request.email() == null || request.password() == null) {
            return ResponseEntity.badRequest().build();
        }

        return userRepository.findByEmailIgnoreCase(request.email())
                .filter(user -> Boolean.TRUE.equals(user.getEnabled()))
                .filter(user -> passwordMatches(request.password(), user.getPasswordHash()))
                .map(mapper::toUserDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401).build());
    }

    @PostMapping("/forgot-password")
    @Transactional
    public ResponseEntity<ForgotPasswordResponse> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        if (request.email() == null || request.email().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        userRepository.findByEmailIgnoreCase(request.email().trim())
                .filter(user -> Boolean.TRUE.equals(user.getEnabled()))
                .ifPresent(user -> {
                    String token = passwordResetTokenService.createToken(user.getEmail());
                    String resetLink = resetPasswordUrl + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
                    passwordResetEmailService.sendResetLink(user.getEmail(), resetLink);
                });

        return ResponseEntity.ok(new ForgotPasswordResponse(PASSWORD_RESET_SENT_MESSAGE));
    }

    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<UserDto> resetPassword(@RequestBody ResetPasswordRequest request) {
        if (request.token() == null || request.token().isBlank()
                || request.newPassword() == null || request.newPassword().length() < 6) {
            return ResponseEntity.badRequest().build();
        }

        var email = passwordResetTokenService.consumeTokenAndGetEmail(request.token());
        if (email.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        return userRepository.findByEmailIgnoreCase(email.get())
                .filter(user -> Boolean.TRUE.equals(user.getEnabled()))
                .map(user -> {
                    user.setPasswordHash(PASSWORD_ENCODER.encode(request.newPassword()));
                    return ResponseEntity.ok(mapper.toUserDto(userRepository.save(user)));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @PostMapping
    @Transactional
    public UserDto createUser(@RequestBody CreateUserRequest request) {
        if (request.email() != null && userRepository.findByEmailIgnoreCase(request.email().trim()).isPresent()) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Email already exists"
            );
        }

        User user = new User();
        user.setId("u-" + UUID.randomUUID());
        user.setName(request.name());
        user.setNameJp(request.nameJp());
        user.setEmail(request.email());
        String password = request.password() == null || request.password().isBlank() ? "demo1234" : request.password();
        user.setPasswordHash(PASSWORD_ENCODER.encode(password));
        user.setPhone(request.phone());
        user.setAddress(request.address());
        user.setRole(request.role() == null ? UserRole.diner : request.role());
        user.setAvatar(request.avatar());
        user.setEnabled(true);

        return mapper.toUserDto(userRepository.save(user));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<UserDto> updateUser(@PathVariable String id, @RequestBody UpdateUserRequest request) {
        return userRepository.findById(id)
                .map(user -> {
                    if (request.name() != null) user.setName(request.name());
                    if (request.nameJp() != null) user.setNameJp(request.nameJp());
                    if (request.email() != null) user.setEmail(request.email());
                    if (request.password() != null && !request.password().isBlank()) {
                        user.setPasswordHash(PASSWORD_ENCODER.encode(request.password()));
                    }
                    if (request.phone() != null) user.setPhone(request.phone());
                    if (request.address() != null) user.setAddress(request.address());
                    if (request.role() != null) user.setRole(request.role());
                    if (request.avatar() != null) user.setAvatar(request.avatar());
                    return ResponseEntity.ok(mapper.toUserDto(userRepository.save(user)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (storedPassword == null || storedPassword.isBlank()) {
            return false;
        }

        if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
            return PASSWORD_ENCODER.matches(rawPassword, storedPassword)
                    || (LEGACY_DEMO_PASSWORD_HASH.equals(storedPassword) && "demo1234".equals(rawPassword));
        }

        return rawPassword.equals(storedPassword);
    }
}
