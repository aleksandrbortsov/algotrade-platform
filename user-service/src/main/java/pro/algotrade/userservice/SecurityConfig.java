package pro.algotrade.userservice;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        return http.csrf().disable()//todo authenticate
            .authorizeRequests().anyRequest().permitAll()
            .and().sessionManagement()
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and().build();
    }
}
