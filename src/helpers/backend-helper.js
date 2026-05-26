import { fetchWrapper } from '@/helpers';
const baseUrl = `${import.meta.env.VITE_API_URL}/api`;

export const backendHelper = {
  requestRegistration: function (data) {
    return fetchWrapper.post(`${baseUrl}/sms/requestEmail/${data.id}`)
            .then(res => {
                console.log(res)
                return res
            })
            .catch(this.handleError);
  },

  sendWelcomeEmail: function (userId, body = {}) {
    return fetchWrapper.post(`${baseUrl}/email/send-welcome/${userId}`, body)
            .then(res => {
                console.log('[welcome-email]', res);
                return res;
            });
  },
}
