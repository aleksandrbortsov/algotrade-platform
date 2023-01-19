package pro.algotrade.userservice.security;

import io.jsonwebtoken.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pro.algotrade.userservice.exception.JwtTokenMalformedException;
import pro.algotrade.userservice.exception.JwtTokenMissingException;

import java.util.Date;


@Component
@RequiredArgsConstructor
@Log4j2
public class JwtUtil {
    @Value("${jwt.secret}")
    private final String jwtSecret;

    @Value("${jwt.token.validity}")
    private final long tokenValidity;

    //roles
    public Claims getClaims(final String token) {
        return Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token).getBody();
    }

    public String getUsername(String token) {
        Claims claims = getClaims(token);
        return claims.getSubject();
    }

    public String generateToken(final String id) {
        Claims claims = Jwts.claims().setSubject(id);
        long nowMillis = System.currentTimeMillis();
        long expMillis = nowMillis + tokenValidity;
        Date exp = new Date(expMillis);
        return Jwts.builder().setClaims(claims).setIssuedAt(new Date(nowMillis)).setExpiration(exp)
            .signWith(SignatureAlgorithm.HS512, jwtSecret).compact();
    }

    public void validateToken(final String token) throws JwtTokenMalformedException, JwtTokenMissingException {
        try {
            getClaims(token);
        } catch (SignatureException ex) {
            throw new JwtTokenMalformedException("Invalid JWT signature");
        } catch (MalformedJwtException ex) {
            throw new JwtTokenMalformedException("Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            throw new JwtTokenMalformedException("Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            throw new JwtTokenMalformedException("Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            throw new JwtTokenMissingException("JWT claims string is empty");
        }
    }

}
