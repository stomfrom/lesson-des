import request from './request.js'

export function getUsers() {
  return request.get('/users')
}

export function getUserPermissions(userId) {
  return request.get(`/users/${userId}/permissions`)
}

export function setUserPermissions(userId, data) {
  return request.put(`/users/${userId}/permissions`, data)
}

export function createUser(data) {
  return request.post('/auth/register', data)
}

export function deleteUser(userId) {
  return request.delete(`/users/${userId}`)
}
