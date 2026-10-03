export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          creado_en: string;
          user_id: string;
        };
        Insert: {
          creado_en?: string;
          user_id: string;
        };
        Update: {
          creado_en?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          activo: boolean;
          creado_en: string;
          desde: string | null;
          enlace: string | null;
          hasta: string | null;
          id: string;
          imagen_mobile_path: string | null;
          imagen_path: string;
          orden: number;
          subtitulo: string | null;
          texto_boton: string | null;
          texto_claro: boolean;
          titulo: string | null;
        };
        Insert: {
          activo?: boolean;
          creado_en?: string;
          desde?: string | null;
          enlace?: string | null;
          hasta?: string | null;
          id?: string;
          imagen_mobile_path?: string | null;
          imagen_path: string;
          orden?: number;
          subtitulo?: string | null;
          texto_boton?: string | null;
          texto_claro?: boolean;
          titulo?: string | null;
        };
        Update: {
          activo?: boolean;
          creado_en?: string;
          desde?: string | null;
          enlace?: string | null;
          hasta?: string | null;
          id?: string;
          imagen_mobile_path?: string | null;
          imagen_path?: string;
          orden?: number;
          subtitulo?: string | null;
          texto_boton?: string | null;
          texto_claro?: boolean;
          titulo?: string | null;
        };
        Relationships: [];
      };
      categoria_grupos: {
        Row: {
          categoria_id: string;
          grupo_id: string;
        };
        Insert: {
          categoria_id: string;
          grupo_id: string;
        };
        Update: {
          categoria_id?: string;
          grupo_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categoria_grupos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "categoria_grupos_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos_etiqueta";
            referencedColumns: ["id"];
          },
        ];
      };
      categoria_plantillas: {
        Row: {
          categoria_id: string;
          plantilla_id: string;
        };
        Insert: {
          categoria_id: string;
          plantilla_id: string;
        };
        Update: {
          categoria_id?: string;
          plantilla_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categoria_plantillas_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "categoria_plantillas_plantilla_id_fkey";
            columns: ["plantilla_id"];
            isOneToOne: false;
            referencedRelation: "plantillas";
            referencedColumns: ["id"];
          },
        ];
      };
      categorias: {
        Row: {
          creado_en: string;
          id: string;
          nombre: string;
          orden: number;
          padre_id: string | null;
          slug: string;
        };
        Insert: {
          creado_en?: string;
          id?: string;
          nombre: string;
          orden?: number;
          padre_id?: string | null;
          slug: string;
        };
        Update: {
          creado_en?: string;
          id?: string;
          nombre?: string;
          orden?: number;
          padre_id?: string | null;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categorias_padre_id_fkey";
            columns: ["padre_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
        ];
      };
      combo_imagenes: {
        Row: {
          alt: string;
          alto: number | null;
          ancho: number | null;
          combo_id: string;
          creado_en: string;
          id: string;
          orden: number;
          path: string;
        };
        Insert: {
          alt?: string;
          alto?: number | null;
          ancho?: number | null;
          combo_id: string;
          creado_en?: string;
          id?: string;
          orden?: number;
          path: string;
        };
        Update: {
          alt?: string;
          alto?: number | null;
          ancho?: number | null;
          combo_id?: string;
          creado_en?: string;
          id?: string;
          orden?: number;
          path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "combo_imagenes_combo_id_fkey";
            columns: ["combo_id"];
            isOneToOne: false;
            referencedRelation: "combos";
            referencedColumns: ["id"];
          },
        ];
      };
      combo_items: {
        Row: {
          cantidad: number;
          combo_id: string;
          id: string;
          orden: number;
          producto_id: string;
        };
        Insert: {
          cantidad?: number;
          combo_id: string;
          id?: string;
          orden?: number;
          producto_id: string;
        };
        Update: {
          cantidad?: number;
          combo_id?: string;
          id?: string;
          orden?: number;
          producto_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "combo_items_combo_id_fkey";
            columns: ["combo_id"];
            isOneToOne: false;
            referencedRelation: "combos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "combo_items_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
        ];
      };
      combos: {
        Row: {
          actualizado_en: string;
          creado_en: string;
          descripcion: Json | null;
          descripcion_texto: string;
          destacado: boolean;
          id: string;
          nombre: string;
          precio: number;
          publicado: boolean;
          slug: string;
        };
        Insert: {
          actualizado_en?: string;
          creado_en?: string;
          descripcion?: Json | null;
          descripcion_texto?: string;
          destacado?: boolean;
          id?: string;
          nombre: string;
          precio?: number;
          publicado?: boolean;
          slug: string;
        };
        Update: {
          actualizado_en?: string;
          creado_en?: string;
          descripcion?: Json | null;
          descripcion_texto?: string;
          destacado?: boolean;
          id?: string;
          nombre?: string;
          precio?: number;
          publicado?: boolean;
          slug?: string;
        };
        Relationships: [];
      };
      cupones: {
        Row: {
          activo: boolean;
          codigo: string;
          creado_en: string;
          desde: string | null;
          hasta: string | null;
          id: string;
          minimo_compra: number;
          tipo: Database["public"]["Enums"]["tipo_cupon"];
          usos: number;
          usos_maximos: number | null;
          valor: number;
        };
        Insert: {
          activo?: boolean;
          codigo: string;
          creado_en?: string;
          desde?: string | null;
          hasta?: string | null;
          id?: string;
          minimo_compra?: number;
          tipo: Database["public"]["Enums"]["tipo_cupon"];
          usos?: number;
          usos_maximos?: number | null;
          valor: number;
        };
        Update: {
          activo?: boolean;
          codigo?: string;
          creado_en?: string;
          desde?: string | null;
          hasta?: string | null;
          id?: string;
          minimo_compra?: number;
          tipo?: Database["public"]["Enums"]["tipo_cupon"];
          usos?: number;
          usos_maximos?: number | null;
          valor?: number;
        };
        Relationships: [];
      };
      etiquetas: {
        Row: {
          color_hex: string | null;
          creado_en: string;
          grupo_id: string;
          id: string;
          orden: number;
          slug: string | null;
          valor: string;
        };
        Insert: {
          color_hex?: string | null;
          creado_en?: string;
          grupo_id: string;
          id?: string;
          orden?: number;
          slug?: never;
          valor: string;
        };
        Update: {
          color_hex?: string | null;
          creado_en?: string;
          grupo_id?: string;
          id?: string;
          orden?: number;
          slug?: never;
          valor?: string;
        };
        Relationships: [
          {
            foreignKeyName: "etiquetas_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos_etiqueta";
            referencedColumns: ["id"];
          },
        ];
      };
      grupos_etiqueta: {
        Row: {
          con_color: boolean;
          creado_en: string;
          es_marca: boolean;
          es_variante: boolean;
          icono: string | null;
          id: string;
          nombre: string;
          orden: number;
          slug: string;
          visible_en_ficha: boolean;
          visible_en_filtros: boolean;
        };
        Insert: {
          con_color?: boolean;
          creado_en?: string;
          es_marca?: boolean;
          es_variante?: boolean;
          icono?: string | null;
          id?: string;
          nombre: string;
          orden?: number;
          slug: string;
          visible_en_ficha?: boolean;
          visible_en_filtros?: boolean;
        };
        Update: {
          con_color?: boolean;
          creado_en?: string;
          es_marca?: boolean;
          es_variante?: boolean;
          icono?: string | null;
          id?: string;
          nombre?: string;
          orden?: number;
          slug?: string;
          visible_en_ficha?: boolean;
          visible_en_filtros?: boolean;
        };
        Relationships: [];
      };
      pedido_items: {
        Row: {
          cantidad: number;
          combo_id: string | null;
          descripcion: string;
          descuento: number;
          detalle: string | null;
          id: string;
          orden: number;
          padre_id: string | null;
          pedido_id: string;
          precio_unitario: number;
          producto_id: string | null;
          promo: string | null;
          sku: string | null;
          subtotal: number;
          variante_id: string | null;
        };
        Insert: {
          cantidad: number;
          combo_id?: string | null;
          descripcion: string;
          descuento?: number;
          detalle?: string | null;
          id?: string;
          orden?: number;
          padre_id?: string | null;
          pedido_id: string;
          precio_unitario: number;
          producto_id?: string | null;
          promo?: string | null;
          sku?: string | null;
          subtotal: number;
          variante_id?: string | null;
        };
        Update: {
          cantidad?: number;
          combo_id?: string | null;
          descripcion?: string;
          descuento?: number;
          detalle?: string | null;
          id?: string;
          orden?: number;
          padre_id?: string | null;
          pedido_id?: string;
          precio_unitario?: number;
          producto_id?: string | null;
          promo?: string | null;
          sku?: string | null;
          subtotal?: number;
          variante_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pedido_items_combo_id_fkey";
            columns: ["combo_id"];
            isOneToOne: false;
            referencedRelation: "combos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedido_items_padre_id_fkey";
            columns: ["padre_id"];
            isOneToOne: false;
            referencedRelation: "pedido_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedido_items_variante_id_fkey";
            columns: ["variante_id"];
            isOneToOne: false;
            referencedRelation: "producto_variantes";
            referencedColumns: ["id"];
          },
        ];
      };
      pedidos: {
        Row: {
          actualizado_en: string;
          creado_en: string;
          cupon_codigo: string | null;
          cupon_id: string | null;
          descuento_cupon: number;
          descuento_promociones: number;
          estado: Database["public"]["Enums"]["estado_pedido"];
          id: string;
          nombre: string;
          notas: string | null;
          numero: number;
          subtotal: number;
          total: number;
        };
        Insert: {
          actualizado_en?: string;
          creado_en?: string;
          cupon_codigo?: string | null;
          cupon_id?: string | null;
          descuento_cupon?: number;
          descuento_promociones?: number;
          estado?: Database["public"]["Enums"]["estado_pedido"];
          id?: string;
          nombre: string;
          notas?: string | null;
          numero?: never;
          subtotal: number;
          total: number;
        };
        Update: {
          actualizado_en?: string;
          creado_en?: string;
          cupon_codigo?: string | null;
          cupon_id?: string | null;
          descuento_cupon?: number;
          descuento_promociones?: number;
          estado?: Database["public"]["Enums"]["estado_pedido"];
          id?: string;
          nombre?: string;
          notas?: string | null;
          numero?: never;
          subtotal?: number;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pedidos_cupon_id_fkey";
            columns: ["cupon_id"];
            isOneToOne: false;
            referencedRelation: "cupones";
            referencedColumns: ["id"];
          },
        ];
      };
      plantilla_grupos: {
        Row: {
          grupo_id: string;
          plantilla_id: string;
        };
        Insert: {
          grupo_id: string;
          plantilla_id: string;
        };
        Update: {
          grupo_id?: string;
          plantilla_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plantilla_grupos_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos_etiqueta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plantilla_grupos_plantilla_id_fkey";
            columns: ["plantilla_id"];
            isOneToOne: false;
            referencedRelation: "plantillas";
            referencedColumns: ["id"];
          },
        ];
      };
      plantillas: {
        Row: {
          creado_en: string;
          id: string;
          nombre: string;
        };
        Insert: {
          creado_en?: string;
          id?: string;
          nombre: string;
        };
        Update: {
          creado_en?: string;
          id?: string;
          nombre?: string;
        };
        Relationships: [];
      };
      producto_etiquetas: {
        Row: {
          etiqueta_id: string;
          producto_id: string;
        };
        Insert: {
          etiqueta_id: string;
          producto_id: string;
        };
        Update: {
          etiqueta_id?: string;
          producto_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producto_etiquetas_etiqueta_id_fkey";
            columns: ["etiqueta_id"];
            isOneToOne: false;
            referencedRelation: "etiquetas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producto_etiquetas_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
        ];
      };
      producto_imagenes: {
        Row: {
          alt: string;
          alto: number | null;
          ancho: number | null;
          creado_en: string;
          id: string;
          orden: number;
          path: string;
          producto_id: string;
        };
        Insert: {
          alt?: string;
          alto?: number | null;
          ancho?: number | null;
          creado_en?: string;
          id?: string;
          orden?: number;
          path: string;
          producto_id: string;
        };
        Update: {
          alt?: string;
          alto?: number | null;
          ancho?: number | null;
          creado_en?: string;
          id?: string;
          orden?: number;
          path?: string;
          producto_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
        ];
      };
      producto_variantes: {
        Row: {
          activa: boolean;
          clave: string;
          id: string;
          orden: number;
          precio: number | null;
          producto_id: string;
          sku: string | null;
          stock: number;
        };
        Insert: {
          activa?: boolean;
          clave: string;
          id?: string;
          orden?: number;
          precio?: number | null;
          producto_id: string;
          sku?: string | null;
          stock?: number;
        };
        Update: {
          activa?: boolean;
          clave?: string;
          id?: string;
          orden?: number;
          precio?: number | null;
          producto_id?: string;
          sku?: string | null;
          stock?: number;
        };
        Relationships: [
          {
            foreignKeyName: "producto_variantes_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
        ];
      };
      productos: {
        Row: {
          actualizado_en: string;
          busqueda: unknown;
          categoria_id: string | null;
          creado_en: string;
          descripcion: Json | null;
          descripcion_texto: string;
          destacado: boolean;
          id: string;
          nombre: string;
          precio: number;
          precio_anterior: number | null;
          publicado: boolean;
          slug: string;
        };
        Insert: {
          actualizado_en?: string;
          busqueda?: never;
          categoria_id?: string | null;
          creado_en?: string;
          descripcion?: Json | null;
          descripcion_texto?: string;
          destacado?: boolean;
          id?: string;
          nombre: string;
          precio?: number;
          precio_anterior?: number | null;
          publicado?: boolean;
          slug: string;
        };
        Update: {
          actualizado_en?: string;
          busqueda?: never;
          categoria_id?: string | null;
          creado_en?: string;
          descripcion?: Json | null;
          descripcion_texto?: string;
          destacado?: boolean;
          id?: string;
          nombre?: string;
          precio?: number;
          precio_anterior?: number | null;
          publicado?: boolean;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
        ];
      };
      promocion_alcance: {
        Row: {
          categoria_id: string | null;
          etiqueta_id: string | null;
          id: string;
          producto_id: string | null;
          promocion_id: string;
        };
        Insert: {
          categoria_id?: string | null;
          etiqueta_id?: string | null;
          id?: string;
          producto_id?: string | null;
          promocion_id: string;
        };
        Update: {
          categoria_id?: string | null;
          etiqueta_id?: string | null;
          id?: string;
          producto_id?: string | null;
          promocion_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promocion_alcance_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promocion_alcance_etiqueta_id_fkey";
            columns: ["etiqueta_id"];
            isOneToOne: false;
            referencedRelation: "etiquetas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promocion_alcance_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promocion_alcance_promocion_id_fkey";
            columns: ["promocion_id"];
            isOneToOne: false;
            referencedRelation: "promociones";
            referencedColumns: ["id"];
          },
        ];
      };
      promociones: {
        Row: {
          activa: boolean;
          alcance_todo: boolean;
          creado_en: string;
          desde: string | null;
          hasta: string | null;
          id: string;
          lleva: number | null;
          nombre: string;
          paga: number | null;
          tipo: Database["public"]["Enums"]["tipo_promocion"];
          valor: number | null;
        };
        Insert: {
          activa?: boolean;
          alcance_todo?: boolean;
          creado_en?: string;
          desde?: string | null;
          hasta?: string | null;
          id?: string;
          lleva?: number | null;
          nombre: string;
          paga?: number | null;
          tipo: Database["public"]["Enums"]["tipo_promocion"];
          valor?: number | null;
        };
        Update: {
          activa?: boolean;
          alcance_todo?: boolean;
          creado_en?: string;
          desde?: string | null;
          hasta?: string | null;
          id?: string;
          lleva?: number | null;
          nombre?: string;
          paga?: number | null;
          tipo?: Database["public"]["Enums"]["tipo_promocion"];
          valor?: number | null;
        };
        Relationships: [];
      };
      variante_etiquetas: {
        Row: {
          etiqueta_id: string;
          grupo_id: string;
          variante_id: string;
        };
        Insert: {
          etiqueta_id: string;
          grupo_id: string;
          variante_id: string;
        };
        Update: {
          etiqueta_id?: string;
          grupo_id?: string;
          variante_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variante_etiquetas_etiqueta_id_grupo_id_fkey";
            columns: ["etiqueta_id", "grupo_id"];
            isOneToOne: false;
            referencedRelation: "etiquetas";
            referencedColumns: ["id", "grupo_id"];
          },
          {
            foreignKeyName: "variante_etiquetas_variante_id_fkey";
            columns: ["variante_id"];
            isOneToOne: false;
            referencedRelation: "producto_variantes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      banners_vigentes: {
        Args: Record<PropertyKey, never>;
        Returns: {
          activo: boolean;
          creado_en: string;
          desde: string | null;
          enlace: string | null;
          hasta: string | null;
          id: string;
          imagen_mobile_path: string | null;
          imagen_path: string;
          orden: number;
          subtitulo: string | null;
          texto_boton: string | null;
          texto_claro: boolean;
          titulo: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "banners";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      buscar_combos: {
        Args: { p_destacados?: boolean; p_limite?: number; p_offset?: number };
        Returns: {
          disponible: boolean;
          id: string;
          imagen_alt: string;
          imagen_path: string;
          nombre: string;
          precio: number;
          precio_items: number;
          productos: number;
          slug: string;
          total: number;
        }[];
      };
      buscar_productos: {
        Args: {
          p_categoria?: string;
          p_destacados?: boolean;
          p_filtros?: Json;
          p_limite?: number;
          p_ofertas?: boolean;
          p_offset?: number;
          p_orden?: string;
          p_q?: string;
        };
        Returns: {
          disponible: boolean;
          id: string;
          imagen_alt: string;
          imagen_alto: number;
          imagen_ancho: number;
          imagen_path: string;
          marca: string;
          nombre: string;
          precio_anterior: number;
          precio_desde: number;
          precio_varia: boolean;
          promo: string;
          slug: string;
          stock_total: number;
          total: number;
          variante_id: string;
        }[];
      };
      cambiar_estado_pedido: {
        Args: {
          p_estado: Database["public"]["Enums"]["estado_pedido"];
          p_pedido_id: string;
        };
        Returns: undefined;
      };
      cotizar_carrito: {
        Args: { p_cupon?: string; p_items: Json };
        Returns: Json;
      };
      crear_pedido: {
        Args: {
          p_cupon?: string;
          p_items: Json;
          p_nombre: string;
          p_notas?: string;
        };
        Returns: Json;
      };
      es_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      f_unaccent: { Args: { texto: string }; Returns: string };
      facetas_productos: {
        Args: { p_categoria?: string; p_filtros?: Json; p_q?: string };
        Returns: {
          cantidad: number;
          color_hex: string;
          es_variante: boolean;
          etiqueta_orden: number;
          etiqueta_slug: string;
          etiqueta_valor: string;
          grupo_nombre: string;
          grupo_orden: number;
          grupo_slug: string;
          seleccionada: boolean;
        }[];
      };
      fusionar_etiquetas: {
        Args: { p_destino: string; p_origen: string };
        Returns: undefined;
      };
      guardar_combo_items: {
        Args: { p_combo_id: string; p_items: Json };
        Returns: undefined;
      };
      guardar_plantilla: {
        Args: {
          p_categorias: string[];
          p_grupos: string[];
          p_id: string;
          p_nombre: string;
        };
        Returns: string;
      };
      guardar_promocion: {
        Args: { p_alcance: Json; p_id: string; p_promo: Json };
        Returns: string;
      };
      guardar_variantes: {
        Args: { p_producto_id: string; p_variantes: Json };
        Returns: undefined;
      };
      precios_producto: {
        Args: { p_producto_id: string };
        Returns: {
          precio: number;
          precio_lista: number;
          promo_cantidad: string;
          promo_unitaria: string;
          variante_id: string;
        }[];
      };
      reordenar_banners: { Args: { p_ids: string[] }; Returns: undefined };
      reordenar_categorias: { Args: { p_ids: string[] }; Returns: undefined };
      reordenar_etiquetas: {
        Args: { p_grupo_id: string; p_ids: string[] };
        Returns: undefined;
      };
      reordenar_grupos: { Args: { p_ids: string[] }; Returns: undefined };
      reordenar_imagenes: {
        Args: { p_ids: string[]; p_producto_id: string };
        Returns: undefined;
      };
      reordenar_imagenes_combo: {
        Args: { p_combo_id: string; p_ids: string[] };
        Returns: undefined;
      };
      slugify: { Args: { texto: string }; Returns: string };
    };
    Enums: {
      estado_pedido: "pendiente" | "confirmado" | "entregado" | "cancelado";
      tipo_cupon: "porcentaje" | "monto_fijo";
      tipo_promocion: "porcentaje" | "monto_fijo" | "nxm" | "segunda_unidad";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      estado_pedido: ["pendiente", "confirmado", "entregado", "cancelado"],
      tipo_cupon: ["porcentaje", "monto_fijo"],
      tipo_promocion: ["porcentaje", "monto_fijo", "nxm", "segunda_unidad"],
    },
  },
} as const;
