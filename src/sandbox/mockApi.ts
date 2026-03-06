function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockApi = {
  success: async () => {
    await delay(500);

    return {
      status: 200,
      data: {
        message: "Operación exitosa",
      },
    };
  },

  created: async () => {
    await delay(500);

    return {
      status: 201,
      data: {
        message: "Recurso creado correctamente",
      },
    };
  },

  badRequest: async () => {
    await delay(500);

    throw {
      response: {
        status: 400,
        data: {
          detail: "Solicitud inválida",
        },
      },
    };
  },

  unauthorized: async () => {
    await delay(500);

    throw {
      response: {
        status: 401,
        data: {
          detail: "Sesión expirada",
        },
      },
    };
  },

  forbidden: async () => {
    await delay(500);

    throw {
      response: {
        status: 403,
        data: {
          detail: "Acceso denegado",
        },
      },
    };
  },

  notFound: async () => {
    await delay(500);

    throw {
      response: {
        status: 404,
        data: {
          detail: "Recurso no encontrado",
        },
      },
    };
  },

  serverError: async () => {
    await delay(500);

    throw {
      response: {
        status: 500,
        data: {
          detail: "Error interno del servidor",
        },
      },
    };
  },

  serviceUnavailable: async () => {
    await delay(500);

    throw {
      response: {
        status: 503,
        data: {
          detail: "Servicio no disponible",
        },
      },
    };
  },

  timeout: async () => {
    await delay(2000);

    throw {
      message: "Network timeout",
    };
  },
};