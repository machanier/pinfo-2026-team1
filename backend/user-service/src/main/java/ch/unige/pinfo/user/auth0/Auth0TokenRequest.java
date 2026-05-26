package ch.unige.pinfo.user.auth0;

public class Auth0TokenRequest {
    public String grant_type;
    public String client_id;
    public String client_secret;
    public String audience;

    public Auth0TokenRequest() {
    }

    public Auth0TokenRequest(String grantType, String clientId, String clientSecret, String audience) {
        this.grant_type = grantType;
        this.client_id = clientId;
        this.client_secret = clientSecret;
        this.audience = audience;
    }
}
