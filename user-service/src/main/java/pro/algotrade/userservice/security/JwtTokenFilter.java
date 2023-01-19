package pro.algotrade.userservice.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pro.algotrade.userservice.exception.JwtTokenMalformedException;
import pro.algotrade.userservice.exception.JwtTokenMissingException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;

@Component
@RequiredArgsConstructor
public class JwtTokenFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public static final String AUTHORIZATION_HEADER = "Authorization";

    @Override
    protected void doFilterInternal(HttpServletRequest httpServletRequest,
                                    HttpServletResponse httpServletResponse,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String authorizationHeader = httpServletRequest.getHeader(AUTHORIZATION_HEADER);
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer")){
            filterChain.doFilter(httpServletRequest, httpServletResponse);
            return;
        }

        final String token = authorizationHeader.split(" ")[1].trim();
        try {
            jwtUtil.validateToken(token);
        } catch (JwtTokenMalformedException e) {
            throw new RuntimeException(e);
        } catch (JwtTokenMissingException e) {
            throw new RuntimeException(e);
        }

        String username = jwtUtil.getUsername(token);

        UsernamePasswordAuthenticationToken upassToken =
            new UsernamePasswordAuthenticationToken(username, null, new ArrayList<>());
        upassToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(httpServletRequest));

        SecurityContextHolder.getContext().setAuthentication(upassToken);
        filterChain.doFilter(httpServletRequest, httpServletResponse);
    }
}
