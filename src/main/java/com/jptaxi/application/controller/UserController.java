package com.jptaxi.application.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
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
import com.jptaxi.application.dto.UpdateUserRequest;
import com.jptaxi.application.dto.UserDto;
import com.jptaxi.application.entity.User;
import com.jptaxi.application.entity.UserRole;
import com.jptaxi.application.repository.UserRepository;
import com.jptaxi.application.service.DtoMapper;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final DtoMapper mapper;

    public UserController(UserRepository userRepository, DtoMapper mapper) {
        this.userRepository = userRepository;
        this.mapper = mapper;
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

    @PostMapping
    @Transactional
    public UserDto createUser(@RequestBody CreateUserRequest request) {
        User user = new User();
        user.setId("u-" + UUID.randomUUID());
        user.setName(request.name());
        user.setNameJp(request.nameJp());
        user.setEmail(request.email());
        user.setPasswordHash(request.password() == null || request.password().isBlank() ? "demo1234" : request.password());
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
                        user.setPasswordHash(request.password());
                    }
                    if (request.phone() != null) user.setPhone(request.phone());
                    if (request.address() != null) user.setAddress(request.address());
                    if (request.role() != null) user.setRole(request.role());
                    if (request.avatar() != null) user.setAvatar(request.avatar());
                    return ResponseEntity.ok(mapper.toUserDto(userRepository.save(user)));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
