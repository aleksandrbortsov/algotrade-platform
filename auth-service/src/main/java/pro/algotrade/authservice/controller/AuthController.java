package pro.algotrade.authservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
//import org.springframework.security.authentication.BadCredentialsException;
//import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pro.algotrade.authservice.dto.UserDetailsDto;
import pro.algotrade.authservice.service.UserDtoService;
import pro.algotrade.authservice.util.JwtUtils;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    //    private final JwtUtils jwtUtil;
    private final UserDtoService userDtoService;
//    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody UserDetailsDto userDto) {

        var userDetailsDto = userDtoService.getUserDto(userDto.getUsername());

//        if (!passwordEncoder.matches(userDto.getPassword(), userDetailsDto.getPassword())) {
//            throw new BadCredentialsException("Bad credentials");
//        }

//        var token = jwtUtil.generateToken(userDto.getUsername());

        return ResponseEntity.ok("token");
    }

    @PostMapping("/auth/register")
    public ResponseEntity<String> register(@RequestBody String userName) {
        // Persist user to some persistent storage
        System.out.println("Info saved...");

        return ResponseEntity.ok("Registered");
    }
}


